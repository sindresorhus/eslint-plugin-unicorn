import {getPropertyName} from '@eslint-community/eslint-utils';
import {isCallExpression, isFunction} from './ast/index.js';
import {
	isBooleanFunction,
	isBooleanFunctionReference,
	isBooleanFunctionTypeAnnotation,
	isKnownBooleanFunctionReference,
	isKnownNonArray,
	isSameReference,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-boolean-sort-comparator';
const SUGGESTION_ID = 'no-boolean-sort-comparator/suggestion';
const messages = {
	[MESSAGE_ID]: 'Do not return a boolean from a sort comparator.',
	[SUGGESTION_ID]: 'Replace with `{{replacement}}`.',
};

const sortMethodNames = new Set(['sort', 'toSorted']);
const orderingOperators = new Set(['>', '>=', '<', '<=']);

const getFunctionReturnExpression = node => {
	if (node.body.type !== 'BlockStatement') {
		return node.body;
	}

	if (node.body.body.length !== 1) {
		return;
	}

	const [statement] = node.body.body;
	if (statement.type === 'ReturnStatement') {
		return statement.argument;
	}
};

const isParameterMirror = (left, right, firstParameter, secondParameter) => {
	left = unwrapTypeScriptExpression(left);
	right = unwrapTypeScriptExpression(right);

	if (left.type === 'Identifier' && right.type === 'Identifier') {
		return (
			(left.name === firstParameter.name && right.name === secondParameter.name)
			|| (left.name === secondParameter.name && right.name === firstParameter.name)
		);
	}

	if (left.type !== 'MemberExpression' || right.type !== 'MemberExpression') {
		return false;
	}

	if (
		left.computed !== right.computed
		|| (
			left.computed
				? !isSameReference(left.property, right.property)
				: left.property.name !== right.property.name
		)
	) {
		return false;
	}

	return isParameterMirror(left.object, right.object, firstParameter, secondParameter);
};

const getOrderingComparison = node => {
	node = unwrapTypeScriptExpression(node);
	return node.type === 'BinaryExpression' && orderingOperators.has(node.operator) ? node : undefined;
};

const hasBooleanFunctionTypeAssertion = (node, context) => {
	while (isTypeScriptExpressionWrapper(node)) {
		if (
			node.typeAnnotation
			&& isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, context.sourceCode.getScope(node))
		) {
			return true;
		}

		node = node.expression;
	}

	return false;
};

const getSuggestion = (comparator, returnExpression, context) => {
	if (
		!returnExpression
		|| comparator.params.length !== 2
		|| comparator.params.some(parameter => parameter.type !== 'Identifier')
		|| comparator.params.some(parameter => parameter.typeAnnotation)
		|| comparator.params.some(parameter => parameter.optional)
		|| comparator.typeParameters
		|| comparator.returnType
		|| context.sourceCode.getCommentsInside(comparator).length > 0
	) {
		return;
	}

	const [firstParameter, secondParameter] = comparator.params;
	if (firstParameter.name === secondParameter.name) {
		return;
	}

	const comparison = getOrderingComparison(returnExpression);
	if (!comparison) {
		return;
	}

	if (isTypeScriptExpressionWrapper(comparison.left) || isTypeScriptExpressionWrapper(comparison.right)) {
		return;
	}

	if (!isParameterMirror(comparison.left, comparison.right, firstParameter, secondParameter)) {
		return;
	}

	const [minuend, subtrahend] = comparison.operator === '>' || comparison.operator === '>='
		? [comparison.left, comparison.right]
		: [comparison.right, comparison.left];
	const replacement = `(${firstParameter.name}, ${secondParameter.name}) => ${context.sourceCode.getText(minuend)} - ${context.sourceCode.getText(subtrahend)}`;

	return [
		{
			messageId: SUGGESTION_ID,
			data: {replacement},
			fix: fixer => fixer.replaceText(comparator, replacement),
		},
	];
};

const getComparatorProblem = (comparator, context) => {
	const unwrappedComparator = unwrapTypeScriptExpression(comparator);

	if (isFunction(unwrappedComparator)) {
		const returnExpression = getFunctionReturnExpression(unwrappedComparator);
		if (
			!isBooleanFunction(unwrappedComparator, context)
			&& !hasBooleanFunctionTypeAssertion(comparator, context)
		) {
			return;
		}

		return {
			node: comparator,
			messageId: MESSAGE_ID,
			suggest: comparator === unwrappedComparator
				? getSuggestion(unwrappedComparator, returnExpression, context)
				: undefined,
		};
	}

	if (isBooleanFunctionReference(unwrappedComparator, context)) {
		return {
			node: comparator,
			messageId: MESSAGE_ID,
		};
	}

	if (
		isKnownBooleanFunctionReference(unwrappedComparator, context)
		|| hasBooleanFunctionTypeAssertion(comparator, context)
	) {
		return {
			node: comparator,
			messageId: MESSAGE_ID,
		};
	}
};

const isSortMethodCall = (node, context) =>
	isCallExpression(node, {minimumArguments: 1})
	&& node.callee.type === 'MemberExpression'
	&& sortMethodNames.has(getPropertyName(node.callee, context.sourceCode.getScope(node.callee)));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isSortMethodCall(callExpression, context)) {
			return;
		}

		if (isKnownNonArray(callExpression.callee.object, context)) {
			return;
		}

		const [comparator] = callExpression.arguments;
		if (comparator.type === 'SpreadElement') {
			return;
		}

		return getComparatorProblem(comparator, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow boolean-returning sort comparators.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
