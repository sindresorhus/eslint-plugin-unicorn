'use strict';
const {hasSideEffect} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const isSameReference = require('./utils/is-same-reference');

const MESSAGE_ID = 'prefer-switch';
const messages = {
	[MESSAGE_ID]: 'Use `switch` instead of multiple `else-if`.'
};

const isSame = (nodeA, nodeB) => nodeA === nodeB || isSameReference(nodeA, nodeB);

function getEqualityComparisons(node) {
	const nodes = [node];
	const compareExpressions = [];
	while (nodes.length > 0) {
		node = nodes.shift();

		if (node.type === 'LogicalExpression' && node.operator === '||') {
			nodes.push(node.left, node.right);
			continue;
		}

		if (node.type !== 'BinaryExpression' || node.operator !== '===') {
			return [];
		}

		compareExpressions.push(node);
	}

	return compareExpressions;
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

		if (!discriminantCandidates) {
			const [{left, right}] = compareExpressions;
			discriminantCandidates = [left, right];
		}

		const candidates = getCommonReferences(
			compareExpressions,
			discriminantCandidates
		);

		if (candidates.length === 0) {
			break;
		}

		discriminantCandidates = candidates;

		ifStatements.push({
			statement,
			compareExpressions
		});
	}

	return {
		ifStatements,
		discriminant: discriminantCandidates && discriminantCandidates[0]
	};
}

const breakAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement',
	'SwitchStatement'
]);
const getBreakTarget = node => {
	for (;node.parent; node = node.parent) {
		if (breakAbleNodeTypes.has(node.type)) {
			return node;
		}
	}
};

const isNodeInsideNode = (inner, outer) =>
	inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1];
function hasBreakInside(breakStatements, nodes) {
	for (const breakStatement of breakStatements) {
		if (!nodes.some(node => isNodeInsideNode(breakStatement, node))) {
			continue;
		}

		const breakTarget = getBreakTarget(breakStatement);
		if (!breakTarget) {
			return true;
		}

		if (nodes.some(node => isNodeInsideNode(node, breakTarget))) {
			return true;
		}
	}

	return false;
}

// Copied from prefer-ternary.js
const getIndentString = (node, sourceCode) => {
	const {line, column} = sourceCode.getLocFromIndex(node.range[0]);
	const lines = sourceCode.getLines();
	const before = lines[line - 1].slice(0, column);

	return before.match(/\s*$/)[0];
};

function * insertBracesIfNotBlockStatement(node, fixer, indent) {
	if (!node || node.type === 'BlockStatement') {
		return;
	}

	yield fixer.insertTextBefore(node, `{\n${indent}`);
	yield fixer.insertTextAfter(node, `\n${indent}}`);
}

function fix({discriminant, ifStatements}, sourceCode) {
	const discriminantText = sourceCode.getText(discriminant);

	return function * (fixer) {
		const firstStatement = ifStatements[0].statement;
		const indent = getIndentString(firstStatement, sourceCode);
		yield fixer.insertTextBefore(firstStatement, `switch (${discriminantText}) {`);
		yield fixer.insertTextAfter(firstStatement, `\n${indent}}`);

		const lastStatement = ifStatements[ifStatements.length - 1].statement;
		if (lastStatement.alternate) {
			yield fixer.insertTextBefore(lastStatement.alternate, `\n${indent}default: `);
			yield * insertBracesIfNotBlockStatement(lastStatement.alternate, fixer, indent);
		}

		for (const {statement, compareExpressions} of ifStatements) {
			const {consequent, alternate, range} = statement;
			const headRange = [range[0], consequent.range[0]];

			if (alternate) {
				const [, start] = consequent.range;
				const [end] = alternate.range;
				yield fixer.replaceTextRange([start, end], '');
			}

			yield fixer.replaceTextRange(headRange, '');
			for (const {left, right} of compareExpressions.sort((nodeA, nodeB) => nodeA.range[0] - nodeB.range[0])) {
				const node = isSame(left, discriminant) ? right : left;
				const text = sourceCode.getText(node);
				yield fixer.insertTextBefore(consequent, `\n${indent}case ${text}: `);
			}

			if (consequent.type === 'BlockStatement') {
				const lastToken = sourceCode.getLastToken(consequent);
				yield fixer.insertTextBefore(lastToken, `\n${indent}break;\n${indent}`);
			} else {
				yield fixer.insertTextAfter(consequent, `\n${indent}break;`);
			}

			yield * insertBracesIfNotBlockStatement(consequent, fixer, indent);
		}
	};
}

const create = context => {
	const {minimumCases} = {
		minimumCases: 3,
		...context.options[0]
	};
	const sourceCode = context.getSourceCode();
	const ifStatements = new Set();
	const breakStatements = [];
	const checked = new Set();

	return {
		'IfStatement'(node) {
			ifStatements.add(node);
		},
		'BreakStatement:not([label])'(node) {
			breakStatements.push(node);
		},
		'Program:exit'() {
			for (const node of ifStatements) {
				if (checked.has(node)) {
					continue;
				}

				const {discriminant, ifStatements} = getStatements(node);

				if (!discriminant || ifStatements.length < minimumCases) {
					continue;
				}

				for (const {statement} of ifStatements) {
					checked.add(statement);
				}

				const problem = {
					loc: {
						start: node.loc.start,
						end: node.consequent.loc.start
					},
					messageId: MESSAGE_ID
				};

				if (
					!hasSideEffect(discriminant, sourceCode) &&
					!hasBreakInside(breakStatements, ifStatements.map(({statement}) => statement))
				) {
					problem.fix = fix({discriminant, ifStatements}, sourceCode);
				}

				context.report(problem);
			}
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			minimumCases: {
				type: 'integer',
				minimum: 2,
				default: 3
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `switch` over multiple `else-if`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
