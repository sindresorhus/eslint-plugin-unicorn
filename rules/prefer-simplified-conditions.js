import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isBoolean,
	isBooleanExpression,
	isControlFlowTest,
	isParenthesized,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	shouldAddParenthesesToLogicalExpressionChild,
	shouldAddParenthesesToUnaryExpressionArgument,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	containsOptionalChain,
	isSame,
} from './utils/comparison.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-simplified-conditions';
const messages = {
	[MESSAGE_ID]: 'Prefer a simplified condition.',
};

const equalityOperatorReplacements = new Map([
	['===', '!=='],
	['!==', '==='],
	['==', '!='],
	['!=', '=='],
]);

const logicalOperatorReplacements = new Map([
	['&&', '||'],
	['||', '&&'],
]);

const logicalOperatorPrecedence = {
	'||': 1,
	'&&': 2,
};

const typeScriptExpressionTypesRequiringParenthesesWhenNegated = new Set([
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const simpleNodeTypes = new Set([
	'Identifier',
	'Literal',
	'ThisExpression',
]);

const isNegation = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '!'
	&& node.prefix;

const isInsideNegatedLogicalExpression = node =>
	node.parent.type === 'LogicalExpression'
	&& isNegation(node.parent.parent);

const isEqualityComparison = node =>
	node.type === 'BinaryExpression'
	&& equalityOperatorReplacements.has(node.operator);

const getOperatorToken = (node, sourceCode) => sourceCode.getTokenAfter(
	node.left,
	token => token.type === 'Punctuator' && token.value === node.operator,
);

const getOppositeEqualityComparisonText = (node, sourceCode) => {
	const operatorToken = getOperatorToken(node, sourceCode);
	const [nodeStart] = sourceCode.getRange(node);
	const [operatorStart, operatorEnd] = sourceCode.getRange(operatorToken);
	const text = sourceCode.getText(node);

	return [
		text.slice(0, operatorStart - nodeStart),
		equalityOperatorReplacements.get(node.operator),
		text.slice(operatorEnd - nodeStart),
	].join('');
};

const shouldAddParenthesesWhenNegated = node =>
	shouldAddParenthesesToUnaryExpressionArgument(node, '!')
	|| typeScriptExpressionTypesRequiringParenthesesWhenNegated.has(node.type);

function getNegatedExpression(node, context) {
	const {sourceCode} = context;

	if (isNegation(node)) {
		return {
			node: node.argument,
			text: getParenthesizedText(node.argument, context),
		};
	}

	if (isEqualityComparison(node)) {
		return {
			node,
			text: getOppositeEqualityComparisonText(node, sourceCode),
		};
	}

	const text = getParenthesizedText(node, context);
	return {
		node: {
			type: 'UnaryExpression',
			operator: '!',
			prefix: true,
			argument: node,
		},
		text: shouldAddParenthesesWhenNegated(node) && !isParenthesized(node, context)
			? `!(${text})`
			: `!${text}`,
	};
}

function shouldAddParenthesesToGeneratedLogicalChild(node, operator) {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'LogicalExpression') {
		return logicalOperatorPrecedence[node.operator] < logicalOperatorPrecedence[operator];
	}

	return [
		'ConditionalExpression',
		'AssignmentExpression',
		'ArrowFunctionExpression',
		'YieldExpression',
		'SequenceExpression',
	].includes(node.type);
}

function getGeneratedLogicalChildText(node, text, operator) {
	return shouldAddParenthesesToGeneratedLogicalChild(node, operator)
		? `(${text})`
		: text;
}

function shouldAddParenthesesToLogicalReplacement(node, operator, context) {
	if (isParenthesized(node, context)) {
		return false;
	}

	const {parent} = node;
	if (!parent) {
		return false;
	}

	if (parent.type === 'LogicalExpression') {
		return shouldAddParenthesesToLogicalExpressionChild(
			{
				type: 'LogicalExpression',
				operator,
			},
			{
				operator: parent.operator,
				property: parent.left === node ? 'left' : 'right',
			},
		);
	}

	if (isTypeScriptExpressionWrapper(parent)) {
		return true;
	}

	return parent.type === 'UnaryExpression'
		|| parent.type === 'AwaitExpression'
		|| parent.type === 'BinaryExpression'
		|| parent.type === 'TaggedTemplateExpression'
		|| (parent.type === 'MemberExpression' && parent.object === node)
		|| (parent.type === 'CallExpression' && parent.callee === node)
		|| (parent.type === 'NewExpression' && parent.callee === node);
}

function getLogicalReplacementText(node, operator, replacement, context) {
	if (shouldAddParenthesesToLogicalReplacement(node, operator, context)) {
		replacement = `(${replacement})`;
	}

	return needsSemicolon(context.sourceCode.getTokenBefore(node), context, replacement)
		? `;${replacement}`
		: replacement;
}

function getDeMorganReplacementText(node, context) {
	const {argument} = node;
	const operator = logicalOperatorReplacements.get(argument.operator);
	const left = getNegatedExpression(argument.left, context);
	const right = getNegatedExpression(argument.right, context);
	const replacement = [
		getGeneratedLogicalChildText(left.node, left.text, operator),
		operator,
		getGeneratedLogicalChildText(right.node, right.text, operator),
	].join(' ');

	return getLogicalReplacementText(node, operator, replacement, context);
}

function isSimpleStableExpression(node) {
	node = unwrapTypeScriptExpression(node);

	if (simpleNodeTypes.has(node.type)) {
		return true;
	}

	if (isNegation(node)) {
		return isSimpleStableExpression(node.argument);
	}

	if (
		node.type === 'BinaryExpression'
		&& (node.operator === '===' || node.operator === '!==')
	) {
		return isSimpleStableExpression(node.left) && isSimpleStableExpression(node.right);
	}

	return false;
}

const isKnownSafeArrayIsArrayCall = (node, context) =>
	isMethodCall(node, {
		object: 'Array',
		method: 'isArray',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& context.sourceCode.isGlobalReference(node.callee.object)
	&& isSimpleStableExpression(node.arguments[0]);

function isStableConditionOperand(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (containsOptionalChain(node)) {
		return false;
	}

	return isSimpleStableExpression(node)
		|| isKnownSafeArrayIsArrayCall(node, context);
}

const isBooleanContext = (node, context) =>
	isBooleanExpression(node, context) || isControlFlowTest(node);

function canFactor(node, operands, context) {
	return operands.every(operand => isStableConditionOperand(operand, context))
		&& (
			isBooleanContext(node, context)
			|| operands.every(operand => isBoolean(operand, context))
		);
}

const isSameCondition = (left, right, context) =>
	isSame(left, right)
	|| (
		isStableConditionOperand(left, context)
		&& isStableConditionOperand(right, context)
		&& context.sourceCode.getText(left) === context.sourceCode.getText(right)
	);

function getCommonTerm(left, right, context) {
	for (const leftProperty of ['left', 'right']) {
		for (const rightProperty of ['left', 'right']) {
			if (isSameCondition(left[leftProperty], right[rightProperty], context)) {
				return {
					common: left[leftProperty],
					leftOther: left[leftProperty === 'left' ? 'right' : 'left'],
					rightOther: right[rightProperty === 'left' ? 'right' : 'left'],
				};
			}
		}
	}
}

function getFactoringProblem(node, context) {
	const innerOperator = logicalOperatorReplacements.get(node.operator);

	if (
		!innerOperator
		|| node.left.type !== 'LogicalExpression'
		|| node.right.type !== 'LogicalExpression'
		|| node.left.operator !== innerOperator
		|| node.right.operator !== innerOperator
	) {
		return;
	}

	const commonTerm = getCommonTerm(node.left, node.right, context);
	if (!commonTerm) {
		return;
	}

	const operands = [
		commonTerm.common,
		commonTerm.leftOther,
		commonTerm.rightOther,
	];

	if (!canFactor(node, operands, context)) {
		return;
	}

	return commonTerm;
}

function getFactoringReplacementText(node, problem, context) {
	const commonText = getGeneratedLogicalChildText(problem.common, getParenthesizedText(problem.common, context), node.left.operator);
	const leftOtherText = getGeneratedLogicalChildText(problem.leftOther, getParenthesizedText(problem.leftOther, context), node.operator);
	const rightOtherText = getGeneratedLogicalChildText(problem.rightOther, getParenthesizedText(problem.rightOther, context), node.operator);
	const replacement = `${commonText} ${node.left.operator} (${leftOtherText} ${node.operator} ${rightOtherText})`;

	return getLogicalReplacementText(node, node.left.operator, replacement, context);
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('UnaryExpression', node => {
		if (
			!isNegation(node)
			|| isNegation(node.parent)
			|| isInsideNegatedLogicalExpression(node)
			|| node.argument.type !== 'LogicalExpression'
			|| !logicalOperatorReplacements.has(node.argument.operator)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		return {
			...problem,
			fix: fixer => fixer.replaceText(node, getDeMorganReplacementText(node, context)),
		};
	});

	context.on('LogicalExpression', node => {
		if (isNegation(node.parent)) {
			return;
		}

		const problem = getFactoringProblem(node, context);
		if (!problem) {
			return;
		}

		const report = {
			node,
			messageId: MESSAGE_ID,
		};

		if (sourceCode.getCommentsInside(node).length > 0) {
			return report;
		}

		return {
			...report,
			fix: fixer => fixer.replaceText(node, getFactoringReplacementText(node, problem, context)),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer simplified conditions.',
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
