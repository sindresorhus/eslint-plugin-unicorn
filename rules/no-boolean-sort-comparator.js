import {getPropertyName} from '@eslint-community/eslint-utils';
import {isCallExpression, isFunction} from './ast/index.js';
import {
	isBooleanFunction,
	isBooleanFunctionReference,
	isGlobalIdentifier,
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
const booleanGlobalFunctionNames = new Set(['Boolean', 'isFinite', 'isNaN']);
const booleanStaticMethods = new Map([
	['Array', new Set(['isArray'])],
	['ArrayBuffer', new Set(['isView'])],
	['Atomics', new Set(['isLockFree'])],
	['Number', new Set(['isFinite', 'isInteger', 'isNaN', 'isSafeInteger'])],
	['Object', new Set(['hasOwn', 'is', 'isExtensible', 'isFrozen', 'isSealed'])],
	['Reflect', new Set(['deleteProperty', 'has'])],
	['URL', new Set(['canParse'])],
]);

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

const isKnownBooleanFunctionReference = (node, context) => {
	if (node.type === 'Identifier') {
		return booleanGlobalFunctionNames.has(node.name) && isGlobalIdentifier(node, context);
	}

	return (
		node.type === 'MemberExpression'
		&& !node.optional
		&& node.object.type === 'Identifier'
		&& isGlobalIdentifier(node.object, context)
		&& booleanStaticMethods.get(node.object.name)?.has(getPropertyName(node, context.sourceCode.getScope(node)))
	);
};

const getSuggestion = (comparator, returnExpression, context) => {
	if (
		!returnExpression
		|| comparator.params.length !== 2
		|| comparator.params.some(parameter => parameter.type !== 'Identifier')
		|| context.sourceCode.getCommentsInside(comparator).length > 0
	) {
		return;
	}

	const comparison = getOrderingComparison(returnExpression);
	if (!comparison) {
		return;
	}

	if (isTypeScriptExpressionWrapper(comparison.left) || isTypeScriptExpressionWrapper(comparison.right)) {
		return;
	}

	const [firstParameter, secondParameter] = comparator.params;
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
	if (isFunction(comparator)) {
		const returnExpression = getFunctionReturnExpression(comparator);
		if (!isBooleanFunction(comparator, context)) {
			return;
		}

		return {
			node: comparator,
			messageId: MESSAGE_ID,
			suggest: getSuggestion(comparator, returnExpression, context),
		};
	}

	if (isBooleanFunctionReference(comparator, context)) {
		return {
			node: comparator,
			messageId: MESSAGE_ID,
		};
	}

	if (isKnownBooleanFunctionReference(comparator, context)) {
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
