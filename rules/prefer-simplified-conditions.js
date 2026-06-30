import {isMethodCall} from './ast/index.js';
import {
	addParenthesizesToReturnOrThrowExpression,
	fixSpaceAroundKeyword,
} from './fix/index.js';
import {
	getParenthesizedText,
	isBoolean,
	isBooleanExpression,
	isControlFlowTest,
	isOnSameLine,
	isParenthesized,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	shouldAddParenthesesToLogicalExpressionChild,
	shouldAddParenthesesToUnaryExpressionArgument,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	containsOptionalChain,
	getBinaryExpressionWithReplacedOperatorText,
	hasLowerLogicalOperatorPrecedence,
	isSame,
	negatedEqualityOperators,
	negatedLogicalOperators,
} from './utils/comparison.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-simplified-conditions';
const messages = {
	[MESSAGE_ID]: 'Prefer a simplified condition.',
};

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
	&& negatedEqualityOperators.has(node.operator);

function getNegatedExpression(node, context, canUseTruthiness) {
	if (isNegation(node)) {
		if (canUseTruthiness || isBoolean(node.argument, context)) {
			return {
				node: node.argument,
				text: getParenthesizedText(node.argument, context),
			};
		}

		return {
			node,
			text: `!${getParenthesizedText(node, context)}`,
		};
	}

	if (isEqualityComparison(node)) {
		return {
			node,
			text: getBinaryExpressionWithReplacedOperatorText(
				node,
				context,
				negatedEqualityOperators.get(node.operator),
			),
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
		text: shouldAddParenthesesToUnaryExpressionArgument(node, '!') && !isParenthesized(node, context)
			? `!(${text})`
			: `!${text}`,
	};
}

function shouldAddParenthesesToGeneratedLogicalChild(node, operator) {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'LogicalExpression') {
		return hasLowerLogicalOperatorPrecedence(node.operator, operator);
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
	const operator = negatedLogicalOperators.get(argument.operator);
	const canUseTruthiness = isControlFlowTest(node);
	const left = getNegatedExpression(argument.left, context, canUseTruthiness);
	const right = getNegatedExpression(argument.right, context, canUseTruthiness);
	const replacement = [
		getGeneratedLogicalChildText(left.node, left.text, operator),
		operator,
		getGeneratedLogicalChildText(right.node, right.text, operator),
	].join(' ');

	return getLogicalReplacementText(node, operator, replacement, context);
}

function needsReturnOrThrowParentheses(node, context) {
	const {parent} = node;
	if (
		parent.type !== 'ReturnStatement'
		&& parent.type !== 'ThrowStatement'
	) {
		return false;
	}

	const {sourceCode} = context;
	const bangToken = sourceCode.getFirstToken(node);
	const tokenAfterBang = sourceCode.getTokenAfter(bangToken);
	return parent.argument === node
		&& !isOnSameLine(bangToken, tokenAfterBang, context)
		&& !isParenthesized(node, context);
}

function * fixDeMorgan(fixer, node, context) {
	const shouldAddReturnOrThrowParentheses = needsReturnOrThrowParentheses(node, context);
	if (!shouldAddReturnOrThrowParentheses) {
		yield fixSpaceAroundKeyword(fixer, node, context);
	}

	yield fixer.replaceText(node, getDeMorganReplacementText(node, context));

	if (shouldAddReturnOrThrowParentheses) {
		yield addParenthesizesToReturnOrThrowExpression(fixer, node.parent, context);
	}
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
	if (!isSameCondition(left.left, right.left, context)) {
		return;
	}

	if (isSameCondition(left.right, right.right, context)) {
		return;
	}

	return {
		common: left.left,
		leftOther: left.right,
		rightOther: right.right,
	};
}

function getCommonFactoringTerms(node, context) {
	const innerOperator = negatedLogicalOperators.get(node.operator);

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
			|| !negatedLogicalOperators.has(node.argument.operator)
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
			fix: fixer => fixDeMorgan(fixer, node, context),
		};
	});

	context.on('LogicalExpression', node => {
		if (isNegation(node.parent)) {
			return;
		}

		const factoringTerms = getCommonFactoringTerms(node, context);
		if (!factoringTerms) {
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
			fix: fixer => fixer.replaceText(node, getFactoringReplacementText(node, factoringTerms, context)),
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
