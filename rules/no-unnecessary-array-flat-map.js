import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isKnownNonArray,
	isParenthesized,
	isSameIdentifier,
	shouldAddParenthesesToMemberExpressionObject,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-array-flat-map';
const SUGGESTION_ID_FILTER_MAP = 'no-unnecessary-array-flat-map/filter-map-suggestion';

const messages = {
	[MESSAGE_ID]: 'Prefer `.{{method}}(…)` over `.flatMap(…)` for this single-item array callback.',
	[SUGGESTION_ID_FILTER_MAP]: 'Replace `.flatMap(…)` with `.filter(…).map(…)`.',
};

const arrowBodyNeedsParenthesesTypes = new Set([
	'ObjectExpression',
	'SequenceExpression',
]);

const typescriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const hasTypeArguments = node => node.typeArguments || node.typeParameters;

const isFilterCallExpression = node => isMethodCall(node, {
	method: 'filter',
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
	computed: false,
});

const isSimpleSingleParameterArrowCallback = node =>
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& !node.returnType
	&& !node.typeParameters
	&& node.params.length === 1
	&& node.params[0].type === 'Identifier'
	&& !node.params[0].optional
	&& node.body.type !== 'BlockStatement';

const isEmptyArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 0;

const getSingleArrayElement = node => {
	if (
		node.type !== 'ArrayExpression'
		|| node.elements.length !== 1
		|| !node.elements[0]
		|| node.elements[0].type === 'SpreadElement'
	) {
		return;
	}

	return node.elements[0];
};

function shouldParenthesizeArrowBody(node, context) {
	if (isParenthesized(node, context)) {
		return false;
	}

	if (arrowBodyNeedsParenthesesTypes.has(node.type)) {
		return true;
	}

	return typescriptExpressionWrapperTypes.has(node.type) && shouldParenthesizeArrowBody(node.expression, context);
}

function getCallbackResult(callback) {
	const directElement = getSingleArrayElement(callback.body);
	if (directElement) {
		return {
			type: 'map',
			element: directElement,
			arrayExpression: callback.body,
		};
	}

	if (callback.body.type !== 'ConditionalExpression') {
		return;
	}

	const {test, consequent, alternate} = callback.body;
	const element = getSingleArrayElement(consequent);
	if (!element || !isEmptyArrayExpression(alternate)) {
		return;
	}

	return {
		type: 'conditional',
		test,
		element,
		arrayExpression: consequent,
	};
}

function getArrowBodyText(node, context) {
	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return shouldParenthesizeArrowBody(node, context)
		? `(${text})`
		: text;
}

function getMemberExpressionObjectText(node, context) {
	if (node.type === 'Super') {
		return 'super';
	}

	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${text})` : text;
}

function getArrowParameterText(callback, context) {
	const parameterText = context.sourceCode.getText(callback.params[0]);
	return callback.params[0].typeAnnotation ? `(${parameterText})` : parameterText;
}

function getFilterMapSuggestion(flatMapCallExpression, callback, callbackResult, context) {
	if (
		hasTypeArguments(flatMapCallExpression)
		|| callback.params[0].typeAnnotation
		|| wouldRemoveComments(context, flatMapCallExpression, [
			flatMapCallExpression.callee.object,
			callbackResult.test,
			callbackResult.element,
		])
		|| hasSideEffect(callbackResult.test, context.sourceCode)
		|| hasSideEffect(callbackResult.element, context.sourceCode)
	) {
		return;
	}

	const arrayText = getMemberExpressionObjectText(flatMapCallExpression.callee.object, context);
	const parameterText = getArrowParameterText(callback, context);
	const testText = getArrowBodyText(callbackResult.test, context);
	const elementText = getArrowBodyText(callbackResult.element, context);

	return {
		messageId: SUGGESTION_ID_FILTER_MAP,
		fix: fixer => fixer.replaceText(
			flatMapCallExpression,
			`${arrayText}.filter(${parameterText} => ${testText}).map(${parameterText} => ${elementText})`,
		),
	};
}

function getProblemForFilterFlatMap(flatMapCallExpression, callbackResult, context) {
	const filterCallExpression = flatMapCallExpression.callee.object;
	if (!isFilterCallExpression(filterCallExpression)) {
		return;
	}

	const problem = {
		node: flatMapCallExpression.callee.property,
		messageId: MESSAGE_ID,
		data: {method: 'map'},
	};

	if (
		hasTypeArguments(filterCallExpression)
		|| hasTypeArguments(flatMapCallExpression)
		|| isKnownNonArray(filterCallExpression.callee.object, context)
		|| wouldRemoveComments(context, callbackResult.arrayExpression, [callbackResult.element])
	) {
		return problem;
	}

	return {
		...problem,
		* fix(fixer) {
			yield fixer.replaceText(flatMapCallExpression.callee.property, 'map');
			yield fixer.replaceText(callbackResult.arrayExpression, getArrowBodyText(callbackResult.element, context));
		},
	};
}

function getProblemForConditionalFlatMap(flatMapCallExpression, callback, callbackResult, context) {
	const method = isSameIdentifier(callbackResult.element, callback.params[0]) ? 'filter' : 'filter().map';
	const problem = {
		node: flatMapCallExpression.callee.property,
		messageId: MESSAGE_ID,
		data: {method},
	};

	if (method === 'filter') {
		if (
			hasTypeArguments(flatMapCallExpression)
			|| hasSideEffect(callbackResult.test, context.sourceCode)
			|| wouldRemoveComments(context, flatMapCallExpression, [
				flatMapCallExpression.callee.object,
				callback.params[0],
				callbackResult.test,
			])
		) {
			return problem;
		}

		const arrayText = getMemberExpressionObjectText(flatMapCallExpression.callee.object, context);
		const parameterText = getArrowParameterText(callback, context);
		const testText = getArrowBodyText(callbackResult.test, context);

		return {
			...problem,
			fix: fixer => fixer.replaceText(
				flatMapCallExpression,
				`${arrayText}.filter(${parameterText} => ${testText})`,
			),
		};
	}

	const suggestion = getFilterMapSuggestion(flatMapCallExpression, callback, callbackResult, context);
	return suggestion
		? {
			...problem,
			suggest: [suggestion],
		}
		: problem;
}

function getProblem(flatMapCallExpression, context) {
	if (
		!isMethodCall(flatMapCallExpression, {
			method: 'flatMap',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| isKnownNonArray(flatMapCallExpression.callee.object, context)
	) {
		return;
	}

	const filterCallExpression = flatMapCallExpression.callee.object;
	if (
		isFilterCallExpression(filterCallExpression)
		&& isKnownNonArray(filterCallExpression.callee.object, context)
	) {
		return;
	}

	const [callback] = flatMapCallExpression.arguments;
	if (!isSimpleSingleParameterArrowCallback(callback)) {
		return;
	}

	const callbackResult = getCallbackResult(callback);
	if (!callbackResult) {
		return;
	}

	if (callbackResult.type === 'map') {
		return getProblemForFilterFlatMap(flatMapCallExpression, callbackResult, context) ?? {
			node: flatMapCallExpression.callee.property,
			messageId: MESSAGE_ID,
			data: {method: 'map'},
		};
	}

	return getProblemForConditionalFlatMap(flatMapCallExpression, callback, callbackResult, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => getProblem(callExpression, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `Array#flatMap()` callbacks that only wrap a single item.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
