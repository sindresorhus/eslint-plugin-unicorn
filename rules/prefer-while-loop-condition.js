import {
	isBooleanLiteral,
	isFunction,
	isLoop,
} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	hasCommentInRange,
	getLastTrailingCommentOnSameLine,
	getReferences,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-while-loop-condition';
const messages = {
	[MESSAGE_ID]: 'Prefer putting the condition in the `while` statement.',
};

const isUnlabeledBreakStatement = node => node?.type === 'BreakStatement' && !node.label;
const isSwitchOrLoop = node => node.type === 'SwitchStatement' || isLoop(node);

const isNodeInsideRange = (node, [start, end], sourceCode) => {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	return nodeStart >= start && nodeEnd <= end;
};

const getOnlyUnlabeledBreakStatement = node => {
	if (isUnlabeledBreakStatement(node)) {
		return node;
	}

	if (node.type !== 'BlockStatement' || node.body.length !== 1) {
		return;
	}

	const [statement] = node.body;
	return isUnlabeledBreakStatement(statement) ? statement : undefined;
};

function hasUnlabeledBreakStatement(node, sourceCode) {
	if (isUnlabeledBreakStatement(node)) {
		return true;
	}

	if (isFunction(node) || isSwitchOrLoop(node)) {
		return false;
	}

	for (const key of sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const element of value) {
				if (
					element
					&& hasUnlabeledBreakStatement(element, sourceCode)
				) {
					return true;
				}
			}

			continue;
		}

		if (
			value
			&& hasUnlabeledBreakStatement(value, sourceCode)
		) {
			return true;
		}
	}

	return false;
}

const hasOtherBreakForSameLoop = (loop, sourceCode) =>
	loop.body.body.slice(1).some(node => hasUnlabeledBreakStatement(node, sourceCode));

const isLabeledStatementBody = node => node.parent.type === 'LabeledStatement' && node.parent.body === node;

const isVariableDefinition = definition => definition.type === 'Variable' && definition.parent.kind === 'var';

const hasLoopBodyLexicalDefinition = (variable, loop, sourceCode) => {
	const loopBodyRange = sourceCode.getRange(loop.body);
	return variable.defs.some(definition =>
		!isVariableDefinition(definition)
		&& isNodeInsideRange(definition.name, loopBodyRange, sourceCode));
};

const hasUnsafeLiftReference = (loop, firstStatement, sourceCode) => {
	const testRange = sourceCode.getRange(firstStatement.test);
	return getReferences(sourceCode.getScope(firstStatement.test)).some(reference =>
		isNodeInsideRange(reference.identifier, testRange, sourceCode)
		&& reference.resolved
		&& hasLoopBodyLexicalDefinition(reference.resolved, loop, sourceCode));
};

const isInfiniteLoop = node => {
	switch (node.type) {
		case 'WhileStatement':
		case 'DoWhileStatement': {
			return isBooleanLiteral(node.test, true);
		}

		case 'ForStatement': {
			return !node.init
				&& !node.update
				&& (!node.test || isBooleanLiteral(node.test, true));
		}

		default: {
			return false;
		}
	}
};

const getLoopConditionText = (test, sourceCode) => {
	if (
		test.type === 'UnaryExpression'
		&& test.operator === '!'
	) {
		return sourceCode.getText(test.argument);
	}

	const text = sourceCode.getText(test);
	return shouldAddParenthesesToUnaryExpressionArgument(test, '!')
		? `!(${text})`
		: `!${text}`;
};

const getLoopHeadRange = (node, sourceCode) => [
	sourceCode.getRange(node)[0],
	sourceCode.getRange(node.body)[0],
];

const getDoWhileTailRange = (node, sourceCode) => [
	sourceCode.getRange(node.body)[1],
	sourceCode.getRange(node)[1],
];

const getLoopBodyHeadRange = (loop, firstStatement, sourceCode) => [
	sourceCode.getRange(loop.body)[0],
	sourceCode.getRange(firstStatement)[0],
];

function * fixLoop(fixer, {
	loop,
	firstStatement,
	condition,
	sourceCode,
	context,
}) {
	if (loop.type === 'WhileStatement') {
		yield fixer.replaceText(loop.test, condition);
	} else if (loop.type === 'ForStatement') {
		yield fixer.replaceTextRange(getLoopHeadRange(loop, sourceCode), `while (${condition}) `);
	} else {
		yield fixer.replaceText(sourceCode.getFirstToken(loop), `while (${condition})`);
		yield fixer.removeRange(getDoWhileTailRange(loop, sourceCode));
	}

	yield removeStatement(firstStatement, context, fixer);
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on([
		'DoWhileStatement',
		'ForStatement',
		'WhileStatement',
	], node => {
		const loopSyntaxCommentRanges = [
			getLoopHeadRange(node, sourceCode),
			...(node.type === 'DoWhileStatement' ? [getDoWhileTailRange(node, sourceCode)] : []),
		];

		if (
			!isInfiniteLoop(node)
			|| node.body.type !== 'BlockStatement'
			|| isLabeledStatementBody(node)
			|| loopSyntaxCommentRanges.some(range => hasCommentInRange(context, range))
			|| (node.type === 'DoWhileStatement' && getLastTrailingCommentOnSameLine(context, node))
		) {
			return;
		}

		const [firstStatement] = node.body.body;
		if (
			!firstStatement
			|| firstStatement.type !== 'IfStatement'
			|| firstStatement.alternate
			|| hasCommentInRange(context, getLoopBodyHeadRange(node, firstStatement, sourceCode))
			|| sourceCode.getCommentsInside(firstStatement).length > 0
			|| getLastTrailingCommentOnSameLine(context, firstStatement)
		) {
			return;
		}

		if (
			!getOnlyUnlabeledBreakStatement(firstStatement.consequent)
			|| hasOtherBreakForSameLoop(node, sourceCode)
			|| hasUnsafeLiftReference(node, firstStatement, sourceCode)
		) {
			return;
		}

		return {
			node: firstStatement,
			messageId: MESSAGE_ID,
			/** @param {ESLint.Rule.RuleFixer} fixer */
			* fix(fixer) {
				const fixes = fixLoop(fixer, {
					loop: node,
					firstStatement,
					condition: getLoopConditionText(firstStatement.test, sourceCode),
					sourceCode,
					context,
				});

				for (const fix of fixes) {
					yield fix;
				}
			},
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer putting the condition in the while statement.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
