import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	addParenthesesToReturnOrThrowExpression,
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

const safeRepeatableBooleanStaticMethods = [
	['Array', 'isArray'],
	['ArrayBuffer', 'isView'],
	['Error', 'isError'],
	['Number', 'isFinite'],
	['Number', 'isInteger'],
	['Number', 'isNaN'],
	['Number', 'isSafeInteger'],
];

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

const isNegativeEqualityComparison = node =>
	node.type === 'BinaryExpression'
	&& (node.operator === '!==' || node.operator === '!=');

function isSimpleAbsorptionReplacement(node) {
	node = unwrapTypeScriptExpression(node);

	return simpleNodeTypes.has(node.type);
}

function isIdentifierSafeToDrop(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || context.sourceCode.isGlobalReference(node)) {
		return false;
	}

	const definition = variable.defs[0];
	if (!definition) {
		return false;
	}

	if (
		definition.type === 'Parameter'
		|| definition.type === 'FunctionName'
	) {
		return true;
	}

	if (definition.type !== 'Variable') {
		return false;
	}

	return definition.parent.kind === 'var';
}

function isSafeToDropAbsorptionOperand(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Literal') {
		return true;
	}

	if (node.type === 'Identifier') {
		return isIdentifierSafeToDrop(node, context);
	}

	if (isNegation(node)) {
		return isSafeToDropAbsorptionOperand(node.argument, context);
	}

	return false;
}

function getNegationWeight(node) {
	node = unwrapTypeScriptExpression(node);

	if (isNegation(node)) {
		return 1 + getNegationWeight(node.argument);
	}

	if (isNegativeEqualityComparison(node)) {
		return 1 + getNegationWeight(node.left) + getNegationWeight(node.right);
	}

	if (node.type === 'BinaryExpression') {
		return getNegationWeight(node.left) + getNegationWeight(node.right);
	}

	if (node.type === 'LogicalExpression') {
		return getNegationWeight(node.left) + getNegationWeight(node.right);
	}

	return 0;
}

function getNegatedExpressionWeight(node, context, canUseTruthiness) {
	node = unwrapTypeScriptExpression(node);

	if (isNegation(node)) {
		return canUseTruthiness || isBoolean(node.argument, context)
			? getNegationWeight(node.argument)
			: 1 + getNegationWeight(node);
	}

	if (isEqualityComparison(node)) {
		const operatorWeight = (node.operator === '===' || node.operator === '==') ? 1 : 0;
		return operatorWeight + getNegationWeight(node.left) + getNegationWeight(node.right);
	}

	return 1 + getNegationWeight(node);
}

function shouldApplyDeMorgan(node, context) {
	const {argument} = node;
	const canUseTruthiness = isControlFlowTest(node);

	// Contract: De Morgan is only a simplification when it reduces explicit negation noise.
	// Plain expansions like `!(a && b)` -> `!a || !b` are often not clearer, especially for range checks like `!(min <= value && value <= max)`.
	// Keep this narrower than `no-negated-comparison`, which is responsible for comparison-only negation rewrites.
	const originalWeight = 1 + getNegationWeight(argument);
	const replacementWeight = getNegatedExpressionWeight(argument.left, context, canUseTruthiness)
		+ getNegatedExpressionWeight(argument.right, context, canUseTruthiness);

	return replacementWeight < originalWeight;
}

const canDropAbsorptionOperand = (node, replacement, removable, context) =>
	isSafeToDropAbsorptionOperand(removable, context)
	&& (
		isBooleanContext(node, context)
		|| (isBoolean(replacement, context) && isBoolean(removable, context))
	);

function getNegatedExpression(node, context, canUseTruthiness) {
	if (isNegation(node)) {
		if (canUseTruthiness || isBoolean(node.argument, context)) {
			return {
				precedenceNode: node.argument,
				text: getParenthesizedText(node.argument, context),
			};
		}

		return {
			precedenceNode: node,
			text: `!${getParenthesizedText(node, context)}`,
		};
	}

	if (isEqualityComparison(node)) {
		return {
			precedenceNode: node,
			text: getBinaryExpressionWithReplacedOperatorText(
				node,
				context,
				negatedEqualityOperators.get(node.operator),
			),
		};
	}

	const text = getParenthesizedText(node, context);
	return {
		precedenceNode: {
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
		getGeneratedLogicalChildText(left.precedenceNode, left.text, operator),
		operator,
		getGeneratedLogicalChildText(right.precedenceNode, right.text, operator),
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
		yield addParenthesesToReturnOrThrowExpression(fixer, node.parent, context);
	}
}

function * fixLogicalExpression(fixer, node, replacement, context) {
	yield fixSpaceAroundKeyword(fixer, node, context);
	yield fixer.replaceText(node, replacement);
}

function isSimpleRepeatableExpression(node) {
	node = unwrapTypeScriptExpression(node);

	if (simpleNodeTypes.has(node.type)) {
		return true;
	}

	if (isNegation(node)) {
		return isSimpleRepeatableExpression(node.argument);
	}

	if (
		node.type === 'BinaryExpression'
		&& (node.operator === '===' || node.operator === '!==')
	) {
		return isSimpleRepeatableExpression(node.left) && isSimpleRepeatableExpression(node.right);
	}

	return false;
}

function isSafeRepeatableBooleanStaticCall(node, context) {
	for (const [object, method] of safeRepeatableBooleanStaticMethods) {
		if (
			isMethodCall(node, {
				object,
				method,
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& context.sourceCode.isGlobalReference(node.callee.object)
			&& node.arguments.every(argument => isSimpleRepeatableExpression(argument))
		) {
			return true;
		}
	}

	return false;
}

function isSafeFactoringOperand(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (containsOptionalChain(node)) {
		return false;
	}

	return isSimpleRepeatableExpression(node)
		|| isSafeRepeatableBooleanStaticCall(node, context);
}

const isBooleanContext = (node, context) =>
	isBooleanExpression(node, context) || isControlFlowTest(node);

function canFactor(node, operands, context) {
	return operands.every(operand => isSafeFactoringOperand(operand, context))
		&& (
			isBooleanContext(node, context)
			|| operands.every(operand => isBoolean(operand, context))
		);
}

const isSameCondition = (left, right, context) =>
	isSame(left, right)
	|| (
		isSafeFactoringOperand(left, context)
		&& isSafeFactoringOperand(right, context)
		&& context.sourceCode.getText(left) === context.sourceCode.getText(right)
	);

function getLeadingCommonFactoringTerms(node, context) {
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

	if (!isSameCondition(node.left.left, node.right.left, context)) {
		return;
	}

	if (isSameCondition(node.left.right, node.right.right, context)) {
		return;
	}

	const commonTerm = {
		common: node.left.left,
		leftOther: node.left.right,
		rightOther: node.right.right,
	};

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

function getAbsorptionTerm(node, context) {
	const innerOperator = negatedLogicalOperators.get(node.operator);
	if (!innerOperator) {
		return;
	}

	if (
		node.right.type === 'LogicalExpression'
		&& node.right.operator === innerOperator
		&& isSimpleAbsorptionReplacement(node.left)
	) {
		if (isSameCondition(node.left, node.right.left, context)) {
			return node.left;
		}

		if (
			isSameCondition(node.left, node.right.right, context)
			&& canDropAbsorptionOperand(node, node.left, node.right.left, context)
		) {
			return node.left;
		}
	}

	if (
		node.left.type === 'LogicalExpression'
		&& node.left.operator === innerOperator
		&& isSimpleAbsorptionReplacement(node.right)
	) {
		if (
			isSameCondition(node.left.left, node.right, context)
			&& canDropAbsorptionOperand(node, node.right, node.left.right, context)
		) {
			return node.right;
		}

		if (
			isSameCondition(node.left.right, node.right, context)
			&& canDropAbsorptionOperand(node, node.right, node.left.left, context)
		) {
			return node.right;
		}
	}
}

function getFactoringReplacementText(node, factoringTerms, context) {
	const commonText = getGeneratedLogicalChildText(factoringTerms.common, getParenthesizedText(factoringTerms.common, context), node.left.operator);
	const leftOtherText = getGeneratedLogicalChildText(factoringTerms.leftOther, getParenthesizedText(factoringTerms.leftOther, context), node.operator);
	const rightOtherText = getGeneratedLogicalChildText(factoringTerms.rightOther, getParenthesizedText(factoringTerms.rightOther, context), node.operator);
	const replacement = `${commonText} ${node.left.operator} (${leftOtherText} ${node.operator} ${rightOtherText})`;

	return getLogicalReplacementText(node, node.left.operator, replacement, context);
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const getProblem = (node, fix) => {
		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		return {
			...problem,
			fix,
		};
	};

	context.on('UnaryExpression', node => {
		if (
			!isNegation(node)
			|| isNegation(node.parent)
			|| isInsideNegatedLogicalExpression(node)
			|| node.argument.type !== 'LogicalExpression'
			|| !negatedLogicalOperators.has(node.argument.operator)
			|| !shouldApplyDeMorgan(node, context)
		) {
			return;
		}

		return getProblem(node, fixer => fixDeMorgan(fixer, node, context));
	});

	context.on('LogicalExpression', node => {
		if (isNegation(node.parent)) {
			return;
		}

		const absorptionTerm = getAbsorptionTerm(node, context);
		if (absorptionTerm) {
			return getProblem(
				node,
				fixer => fixLogicalExpression(
					fixer,
					node,
					getLogicalReplacementText(node, node.operator, getParenthesizedText(absorptionTerm, context), context),
					context,
				),
			);
		}

		const factoringTerms = getLeadingCommonFactoringTerms(node, context);
		if (!factoringTerms) {
			return;
		}

		return getProblem(
			node,
			fixer => fixLogicalExpression(fixer, node, getFactoringReplacementText(node, factoringTerms, context), context),
		);
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
