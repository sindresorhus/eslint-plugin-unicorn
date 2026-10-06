import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {isUndefined} from './ast/index.js';
import isSameReference from './utils/is-same-reference.js';
import {
	getIndentString,
	getLinebreak,
	getLogicalExpressionOperands,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-switch';
const messages = {
	[MESSAGE_ID]: 'Use `switch` instead of multiple `else-if`.',
};

const isSame = (nodeA, nodeB) => nodeA === nodeB || isSameReference(nodeA, nodeB);
const isConstant = node => node.type === 'Literal' || isUndefined(node);

const getDiscriminantCandidates = ({left, right}) => [left, right].filter(node => !isConstant(node));

function getEqualityComparisons(node) {
	const comparisons = getLogicalExpressionOperands(node, '||');
	return comparisons.every(comparison => comparison.type === 'BinaryExpression' && comparison.operator === '===') ? comparisons : [];
}

function getCommonReferences(expressions, candidates) {
	for (const {left, right} of expressions) {
		candidates = candidates.filter(node => isSame(node, left) || isSame(node, right));

		if (candidates.length === 0) {
			break;
		}
	}

	return candidates;
}

function getStatements(statement) {
	let discriminantCandidates;
	const ifStatements = [];
	for (; statement && statement.type === 'IfStatement'; statement = statement.alternate) {
		const {test} = statement;
		const compareExpressions = getEqualityComparisons(test);

		if (compareExpressions.length === 0) {
			break;
		}

		discriminantCandidates ||= getDiscriminantCandidates(compareExpressions[0]);

		const candidates = getCommonReferences(
			compareExpressions,
			discriminantCandidates,
		);

		if (candidates.length === 0) {
			break;
		}

		discriminantCandidates = candidates;

		ifStatements.push({
			statement,
			compareExpressions,
		});
	}

	return {
		ifStatements,
		discriminant: discriminantCandidates && discriminantCandidates[0],
	};
}

const breakAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement',
	'SwitchStatement',
]);
const getBreakTarget = node => {
	for (; node.parent; node = node.parent) {
		if (breakAbleNodeTypes.has(node.type)) {
			return node;
		}
	}
};

const isNodeInsideNode = (inner, outer, context) => {
	const {sourceCode} = context;
	return sourceCode.getRange(inner)[0] >= sourceCode.getRange(outer)[0] && sourceCode.getRange(inner)[1] <= sourceCode.getRange(outer)[1];
};

function hasBreakInside(breakStatements, node, context) {
	for (const breakStatement of breakStatements) {
		if (!isNodeInsideNode(breakStatement, node, context)) {
			continue;
		}

		const breakTarget = getBreakTarget(breakStatement);

		if (!breakTarget) {
			return true;
		}

		if (isNodeInsideNode(node, breakTarget, context)) {
			return true;
		}
	}

	return false;
}

function * insertBracesIfNotBlockStatement(node, fixer, indent, linebreak) {
	if (!node || node.type === 'BlockStatement') {
		return;
	}

	yield fixer.insertTextBefore(node, `{${linebreak}${indent}`);
	yield fixer.insertTextAfter(node, `${linebreak}${indent}}`);
}

function * insertBreakStatement(node, fixer, sourceCode, indent, linebreak) {
	if (node.type === 'BlockStatement') {
		const lastToken = sourceCode.getLastToken(node);
		yield fixer.insertTextBefore(lastToken, `${linebreak}${indent}break;${linebreak}${indent}`);
	} else {
		yield fixer.insertTextAfter(node, `${linebreak}${indent}break;`);
	}
}

function getBlockStatementLastNode(blockStatement) {
	const {body} = blockStatement;
	for (let index = body.length - 1; index >= 0; index--) {
		const node = body[index];
		if (node.type === 'FunctionDeclaration' || node.type === 'EmptyStatement') {
			continue;
		}

		if (node.type === 'BlockStatement') {
			const last = getBlockStatementLastNode(node);
			if (last) {
				return last;
			}

			continue;
		}

		return node;
	}
}

// Not worth using code path analysis here: a false positive just inserts a redundant `break` (still correct code).
function shouldInsertBreakStatement(node) {
	switch (node.type) {
		case 'ReturnStatement':
		case 'ThrowStatement': {
			return false;
		}

		case 'IfStatement': {
			return !node.alternate
				|| shouldInsertBreakStatement(node.consequent)
				|| shouldInsertBreakStatement(node.alternate);
		}

		case 'BlockStatement': {
			const lastNode = getBlockStatementLastNode(node);
			return !lastNode || shouldInsertBreakStatement(lastNode);
		}

		default: {
			return true;
		}
	}
}

function fix({discriminant, ifStatements}, context, options) {
	const {sourceCode} = context;
	const discriminantText = sourceCode.getText(discriminant);

	return function * (fixer, {abort}) {
		const firstStatement = ifStatements[0].statement;
		const indent = getIndentString(firstStatement, context);
		const linebreak = getLinebreak(context);

		// The `if` head and the text before the `else` are removed, a comment in between would be dropped
		const isCommentRemoved = ifStatements.some(({statement}) => {
			const {consequent, alternate} = statement;
			return wouldRemoveComments(context, [sourceCode.getRange(statement)[0], sourceCode.getRange(consequent)[0]])
				|| (
					alternate
					&& wouldRemoveComments(context, [sourceCode.getRange(consequent)[1], sourceCode.getRange(alternate)[0]])
				);
		});

		if (isCommentRemoved) {
			abort();
		}

		// A repeated `case` label is unreachable. The branch is already dead in the `else-if` chain, but the fix should not produce a duplicate label. `case '1':` and `case "1":` are the same label, so the value is compared, not the text.
		const caseLabels = new Set();
		for (const {compareExpressions} of ifStatements) {
			for (const {left, right} of compareExpressions) {
				const node = isSame(left, discriminant) ? right : left;
				const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
				const label = staticValue
					? `value:${typeof staticValue.value}:${String(staticValue.value)}`
					: `text:${sourceCode.getText(node)}`;

				if (caseLabels.has(label)) {
					abort();
				}

				caseLabels.add(label);
			}
		}

		yield fixer.insertTextBefore(firstStatement, `switch (${discriminantText}) {`);

		const lastStatement = ifStatements.at(-1).statement;
		if (lastStatement.alternate) {
			const {alternate} = lastStatement;
			yield fixer.insertTextBefore(alternate, `${linebreak}${indent}default: `);
			/*
			Technically, we should insert braces for the following case,
			but who writes like this? And using `let`/`const` is invalid.

			```js
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
			else var a = 1;
			```
			*/
		}

		for (const {statement, compareExpressions} of ifStatements) {
			const {consequent, alternate} = statement;

			if (alternate) {
				const [, start] = sourceCode.getRange(consequent);
				const [end] = sourceCode.getRange(alternate);
				yield fixer.removeRange([start, end]);
			}

			const headRange = [
				sourceCode.getRange(statement)[0],
				sourceCode.getRange(consequent)[0],
			];
			yield fixer.removeRange(headRange);
			for (const {left, right} of compareExpressions) {
				const node = isSame(left, discriminant) ? right : left;
				const text = sourceCode.getText(node);
				yield fixer.insertTextBefore(consequent, `${linebreak}${indent}case ${text}: `);
			}

			if (shouldInsertBreakStatement(consequent)) {
				yield insertBreakStatement(consequent, fixer, sourceCode, indent, linebreak);
				yield insertBracesIfNotBlockStatement(consequent, fixer, indent, linebreak);
			}
		}

		// The empty `default:` case is added between the last `case` braces and the `switch` braces, fixes inserted at the same position are applied in yield order
		if (!lastStatement.alternate) {
			if (options.emptyDefaultCase === 'no-default-comment') {
				yield fixer.insertTextAfter(firstStatement, `${linebreak}${indent}// No default`);
			} else if (options.emptyDefaultCase === 'do-nothing-comment') {
				yield fixer.insertTextAfter(firstStatement, `${linebreak}${indent}default:${linebreak}${indent}// Do nothing`);
			}
		}

		yield fixer.insertTextAfter(firstStatement, `${linebreak}${indent}}`);
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = {
		...context.options[0],
		insertBreakInDefaultCase: false,
	};
	const {sourceCode} = context;
	const ifStatements = new Set();
	const breakStatements = [];
	const checked = new Set();

	context.on('IfStatement', node => {
		ifStatements.add(node);
	});

	context.on('BreakStatement', node => {
		if (!node.label) {
			breakStatements.push(node);
		}
	});

	context.on('Program:exit', function * () {
		for (const node of ifStatements) {
			if (checked.has(node)) {
				continue;
			}

			const {discriminant, ifStatements} = getStatements(node);

			if (!discriminant || ifStatements.length < options.minimumCases) {
				continue;
			}

			for (const {statement} of ifStatements) {
				checked.add(statement);
			}

			const problem = {
				loc: {
					start: sourceCode.getLoc(node).start,
					end: sourceCode.getLoc(node.consequent).start,
				},
				messageId: MESSAGE_ID,
			};

			if (
				!hasSideEffect(discriminant, sourceCode)
				&& ifStatements.every(({statement}) => !hasBreakInside(breakStatements, statement, context))
			) {
				const switchFix = fix({discriminant, ifStatements}, context, options);

				// A `switch` reads the discriminant once, the `else-if` chain reads it once per branch. A getter can return a different value each time, which changes not only how often it is read but which branch runs, so that is offered as a suggestion.
				if (hasSideEffect(discriminant, sourceCode, {considerGetters: true})) {
					problem.suggest = [
						{
							messageId: MESSAGE_ID,
							fix: switchFix,
						},
					];
				} else {
					problem.fix = switchFix;
				}
			}

			yield problem;
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			minimumCases: {
				type: 'integer',
				minimum: 2,
				description: 'The minimum number of `if`/`else if` cases before suggesting a `switch` statement.',
			},
			emptyDefaultCase: {
				enum: [
					'no-default-comment',
					'do-nothing-comment',
					'no-default-case',
				],
				description: 'How to handle an empty `default` case.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `switch` over multiple `else-if`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [
			{
				minimumCases: 3,
				emptyDefaultCase: 'no-default-comment',
			},
		],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
