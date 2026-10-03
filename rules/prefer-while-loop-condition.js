import {
	isBooleanLiteral,
	isFunction,
	isLoop,
} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	getCommentSafeProblem,
	getLastTrailingCommentOnSameLine,
	getReferences,
	hasNonDirectiveComment,
	shouldAddParenthesesToUnaryExpressionArgument,
	getVisitorChildNodes,
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

	return getVisitorChildNodes(node, sourceCode.visitorKeys).some(child => hasUnlabeledBreakStatement(child, sourceCode));
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
	if (node.type === 'ForStatement') {
		return !node.init
			&& !node.update
			&& (!node.test || isBooleanLiteral(node.test, true));
	}

	// `WhileStatement` or `DoWhileStatement`
	return isBooleanLiteral(node.test, true);
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

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on([
		'DoWhileStatement',
		'ForStatement',
		'WhileStatement',
	], node => {
		if (
			!isInfiniteLoop(node)
			|| node.body.type !== 'BlockStatement'
			|| isLabeledStatementBody(node)
		) {
			return;
		}

		const [firstStatement] = node.body.body;
		if (
			!firstStatement
			|| firstStatement.type !== 'IfStatement'
			|| firstStatement.alternate
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

		const firstStatementTrailingComment = getLastTrailingCommentOnSameLine(context, firstStatement);
		const loopTrailingComment = node.type === 'DoWhileStatement' && getLastTrailingCommentOnSameLine(context, node);
		const commentRange = [
			sourceCode.getRange(node)[0],
			sourceCode.getRange(loopTrailingComment || node)[1],
		];
		const preservedBodyRange = [
			sourceCode.getRange(firstStatementTrailingComment ?? firstStatement)[1],
			sourceCode.getRange(node.body)[1],
		];
		if (hasNonDirectiveComment(context, commentRange, [preservedBodyRange])) {
			return;
		}

		return getCommentSafeProblem(context, {
			node: firstStatement,
			messageId: MESSAGE_ID,
			/**
			@param {ESLint.Rule.RuleFixer} fixer
			*/
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
		}, commentRange, [preservedBodyRange]);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
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
