import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isMethodCall} from './ast/index.js';
import {
	addParenthesesToReturnOrThrowExpression,
	fixSpaceAroundKeyword,
} from './fix/index.js';
import {
	checkVueTemplate,
	getCommentSafeProblem,
	getLogicalExpressionOperands,
	getNegatedExpressionText,
	getParenthesizedText,
	getTokenStore,
	isBoolean,
	isBooleanContext,
	isControlFlowTest,
	isOnSameLine,
	isParenthesized,
	isReferenceContext,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	shouldAddParenthesesToExpressionStart,
	shouldAddParenthesesToLogicalExpressionChild,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	containsOptionalChain,
	getBinaryExpressionWithReplacedOperatorText,
	isSame,
	negatedEqualityOperators,
	negatedLogicalOperators,
} from './utils/comparison.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-simplified-conditions';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer a simplified condition.',
	[MESSAGE_ID_SUGGESTION]: 'Simplify the condition.',
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

	return simpleNodeTypes.has(node.type) || getStaticStringValue(node) !== undefined;
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

	if (node.type === 'Literal' || getStaticStringValue(node) !== undefined) {
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
	if (context.options[0].negatedConditions === 'expand') {
		return true;
	}

	const {argument} = node;
	const canUseTruthiness = isControlFlowTest(node);

	// Default contract: De Morgan is only a simplification when it reduces explicit negation noise.
	// Plain expansions like `!(a && b)` -> `!a || !b` are often not clearer, especially for range checks like `!(min <= value && value <= max)`.
	// Keep the default narrower than `no-negated-comparison`, which is responsible for comparison-only negation rewrites.
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

// The returned text never needs parentheses as an operand of `&&`/`||`: a source operand of `!` that binds looser than `!` is always parenthesized in the source, and every generated text is a unary or equality expression.
function getNegatedOperandText(node, context, canUseTruthiness) {
	if (isNegation(node)) {
		if (canUseTruthiness || isBoolean(node.argument, context)) {
			return getParenthesizedText(node.argument, context);
		}

		return `!${getParenthesizedText(node, context)}`;
	}

	if (isEqualityComparison(node)) {
		return getBinaryExpressionWithReplacedOperatorText(
			node,
			context,
			negatedEqualityOperators.get(node.operator),
		);
	}

	return getNegatedExpressionText(node, context);
}

function shouldAddParenthesesToLogicalReplacement(node, operator, context) {
	if (isParenthesized(node, context)) {
		return false;
	}

	const {parent} = node;
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

	// An unparenthesized `!` or logical expression can not be a member object, a callee, or a tag.
	return ['UnaryExpression', 'AwaitExpression', 'BinaryExpression'].includes(parent.type);
}

function getLogicalReplacementText(node, operator, replacement, context) {
	if (shouldAddParenthesesToLogicalReplacement(node, operator, context)) {
		replacement = `(${replacement})`;
	}

	return needsSemicolon(getTokenStore(context, node).getTokenBefore(node), context, replacement)
		? `;${replacement}`
		: replacement;
}

function getDeMorganReplacementText(node, context) {
	const {argument} = node;
	const operator = negatedLogicalOperators.get(argument.operator);
	const canUseTruthiness = isControlFlowTest(node);
	let replacement = [
		getNegatedOperandText(argument.left, context, canUseTruthiness),
		operator,
		getNegatedOperandText(argument.right, context, canUseTruthiness),
	].join(' ');

	let leadingExpression;
	if (isEqualityComparison(argument.left)) {
		leadingExpression = argument.left.left;
	} else if (isNegation(argument.left) && (canUseTruthiness || isBoolean(argument.left.argument, context))) {
		leadingExpression = argument.left.argument;
	}

	if (
		leadingExpression
		&& !isParenthesized(leadingExpression, context)
		&& !shouldAddParenthesesToLogicalReplacement(node, operator, context)
		&& shouldAddParenthesesToExpressionStart(leadingExpression, context, node)
	) {
		replacement = `(${replacement})`;
	}

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

	const tokenStore = getTokenStore(context, node);
	const bangToken = tokenStore.getFirstToken(node);
	const tokenAfterBang = tokenStore.getTokenAfter(bangToken);
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

function isFactoringOperand(node) {
	node = unwrapTypeScriptExpression(node);

	if (
		simpleNodeTypes.has(node.type)
		|| node.type === 'Super'
		|| node.type === 'CallExpression'
	) {
		return true;
	}

	if (node.type === 'MemberExpression') {
		return isFactoringOperand(node.object)
			&& (!node.computed || isFactoringOperand(node.property));
	}

	if (node.type === 'TemplateLiteral') {
		return node.expressions.length === 0;
	}

	if (isNegation(node)) {
		return isFactoringOperand(node.argument);
	}

	if (
		node.type === 'BinaryExpression'
		&& ['==', '!=', '===', '!==', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(node.operator)
	) {
		return isFactoringOperand(node.left) && isFactoringOperand(node.right);
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
			&& node.arguments.every(argument => isFactoringOperand(argument) && !hasSideEffect(argument, context.sourceCode))
		) {
			return true;
		}
	}

	return false;
}

function isSafeFactoringOperand(node, context) {
	node = unwrapTypeScriptExpression(node);

	return !hasSideEffect(node, context.sourceCode)
		|| isSafeRepeatableBooleanStaticCall(node, context);
}

function canFactor(node, operands, context) {
	return operands.every(operand => isFactoringOperand(operand) && !containsOptionalChain(operand))
		&& (
			isBooleanContext(node, context)
			|| operands.every(operand => isBoolean(operand, context))
		);
}

const isSameCondition = (left, right, context) =>
	isSame(left, right)
	|| (
		isFactoringOperand(left)
		&& isFactoringOperand(right)
		&& context.sourceCode.getText(left) === context.sourceCode.getText(right)
	);

function getLeadingCommonFactoringTerms(node, context) {
	const innerOperator = negatedLogicalOperators.get(node.operator);
	if (
		!innerOperator
		|| node.left.type !== 'LogicalExpression'
		|| node.right.type !== 'LogicalExpression'
	) {
		return;
	}

	const before = getLogicalExpressionOperands(node.left, node.operator);
	const after = getLogicalExpressionOperands(node.right, node.operator);
	const leftOperands = getLogicalExpressionOperands(before.pop(), innerOperator);
	const rightOperands = getLogicalExpressionOperands(after.shift(), innerOperator);
	if (
		leftOperands.length < 2
		|| rightOperands.length < 2
		|| !isSameCondition(leftOperands[0], rightOperands[0], context)
	) {
		return;
	}

	if (
		leftOperands.length === rightOperands.length
		&& leftOperands.every((operand, index) => isSameCondition(operand, rightOperands[index], context))
	) {
		return;
	}

	const operands = [...leftOperands, ...rightOperands];
	if (!canFactor(node, operands, context)) {
		return;
	}

	return {
		common: leftOperands[0],
		leftRemainingOperands: leftOperands.slice(1),
		rightRemainingOperands: rightOperands.slice(1),
		before,
		after,
		innerOperator,
		shouldSuggest: operands.some(operand => !isSafeFactoringOperand(operand, context)),
	};
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
	// Factoring operands do not need parentheses for logical precedence, but grouped remainders do.
	const {innerOperator, before, after} = factoringTerms;
	let commonText = getParenthesizedText(factoringTerms.common, context);
	// Keep `in` grouped so factoring also produces valid `for` initializers.
	if (
		!isParenthesized(factoringTerms.common, context)
		&& getTokenStore(context, factoringTerms.common).getTokens(factoringTerms.common).some(token => token.type === 'Keyword' && token.value === 'in')
	) {
		commonText = `(${commonText})`;
	}

	const [leftRemainingText, rightRemainingText] = [factoringTerms.leftRemainingOperands, factoringTerms.rightRemainingOperands].map(operands => {
		const text = operands.map(operand => getParenthesizedText(operand, context)).join(` ${innerOperator} `);
		return operands.length > 1 ? `(${text})` : text;
	});
	let replacement = `${commonText} ${innerOperator} (${leftRemainingText} ${node.operator} ${rightRemainingText})`;
	if (before.length === 0 && after.length === 0) {
		if (
			!isParenthesized(factoringTerms.common, context)
			&& !shouldAddParenthesesToLogicalReplacement(node, innerOperator, context)
			&& shouldAddParenthesesToExpressionStart(factoringTerms.common, context, node)
		) {
			replacement = `(${replacement})`;
		}

		return getLogicalReplacementText(node, innerOperator, replacement, context);
	}

	const operandTexts = [
		...before.map(operand => getParenthesizedText(operand, context)),
		`(${replacement})`,
		...after.map(operand => getParenthesizedText(operand, context)),
	];
	let text = operandTexts.join(` ${node.operator} `);
	// Preserve leading grouping removed when flattening the surrounding chain.
	if (
		before.length > 0
		&& !isParenthesized(before[0], context)
		&& getTokenStore(context, node).getFirstToken(node).value === '('
	) {
		text = `(${text})`;
	}

	return getLogicalReplacementText(node, node.operator, text, context);
}

function isSupportedExpression(node, context) {
	if (getTokenStore(context, node) === context.sourceCode) {
		return true;
	}

	for (; node; node = node.parent) {
		if (node.type.endsWith('Statement')) {
			return false;
		}

		if (node.type === 'VExpressionContainer') {
			return isControlFlowTest(node.expression)
				&& ['"', '\''].includes(context.sourceCode.text[context.sourceCode.getRange(node)[0]]);
		}
	}

	return false;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const getProblem = (node, fix, shouldSuggest = false) => {
		if (!isSupportedExpression(node, context)) {
			return;
		}

		return getCommentSafeProblem(context, {
			node,
			messageId: MESSAGE_ID,
			...(shouldSuggest
				? {suggest: [{messageId: MESSAGE_ID_SUGGESTION, fix}]}
				: {fix}),
		});
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
				isReferenceContext(node)
					? undefined
					: fixer => fixLogicalExpression(
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
			factoringTerms.shouldSuggest,
		);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer simplified conditions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					negatedConditions: {
						enum: ['simplify', 'expand'],
						description: 'Whether to expand negated logical conditions only when it reduces negations or regardless of negation count.',
					},
				},
			},
		],
		defaultOptions: [{negatedConditions: 'simplify'}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
