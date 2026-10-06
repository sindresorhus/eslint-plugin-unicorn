import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isEmptyArrayExpression, isFunction, isMethodCall} from './ast/index.js';
import {
	getConciseArrowBodyText,
	getParenthesizedRange,
	getParenthesizedText,
	hasTypeArguments,
	isKnownNonIndexedCollection,
	isParenthesized,
	isSameIdentifier,
	isTypeScriptFile,
	getMemberExpressionObjectText,
	wouldRemoveComments,
} from './utils/index.js';
import {createTypeCheckers, target, unknown} from './utils/type-helpers.js';

const MESSAGE_ID = 'no-unnecessary-array-flat-map';
const SUGGESTION_ID_FILTER_MAP = 'no-unnecessary-array-flat-map/filter-map-suggestion';
const MESSAGE_ID_ARRAY_WRAPPER = 'no-unnecessary-array-flat-map/array-wrapper';
const SUGGESTION_ID_ARRAY_WRAPPER = 'no-unnecessary-array-flat-map/array-wrapper-suggestion';

const messages = {
	[MESSAGE_ID]: 'Prefer `.{{method}}(…)` over `.flatMap(…)` for this single-item array callback.',
	[SUGGESTION_ID_FILTER_MAP]: 'Replace `.flatMap(…)` with `.filter(…).map(…)`.',
	[MESSAGE_ID_ARRAY_WRAPPER]: 'Wrapping this value in an array is unnecessary.',
	[SUGGESTION_ID_ARRAY_WRAPPER]: 'Remove the array wrapper.',
};

const nonArrayExpressionTypes = new Set([
	'Literal',
	'ObjectExpression',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'TemplateLiteral',
	'UnaryExpression',
	'BinaryExpression',
	'UpdateExpression',
]);

const primitiveTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSLiteralType',
]);

const primitiveTypeNames = new Set(['bigint', 'boolean', 'number', 'string', 'symbol']);

const {isTarget: isNonArrayValue} = createTypeCheckers({
	checkClassHeritage: false,
	allowNullishInMixedUnion: true,
	targetTypeNames: new Set(),
	isTargetNode: node => nonArrayExpressionTypes.has(node.type),
	isTargetTypeAnnotation: node => primitiveTypeAnnotations.has(node?.type),
	isTargetType: type => type.isLiteral?.() || primitiveTypeNames.has(type.intrinsicName),
	getStaticType: value => value === null || typeof value !== 'object' ? target : unknown,
});

const isFilterCallExpression = node => isMethodCall(node, {
	method: 'filter',
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
	computed: false,
});

const isTypeScriptVueSfc = sourceCode => {
	const documentFragment = sourceCode.parserServices.getDocumentFragment?.();
	return documentFragment?.children.some(node =>
		node.type === 'VElement'
		&& node.name === 'script'
		&& node.startTag.attributes.some(attribute =>
			!attribute.directive
			&& attribute.key.name === 'lang'
			&& (attribute.value?.value === 'ts' || attribute.value?.value === 'tsx'),
		),
	) ?? false;
};

const isSimpleSingleParameterArrowCallback = node =>
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& !node.returnType
	&& !node.typeParameters
	&& node.params.length === 1
	&& node.params[0].type === 'Identifier'
	&& !node.params[0].optional
	&& node.body.type !== 'BlockStatement';

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
	const testText = getConciseArrowBodyText(callbackResult.test, context);
	const elementText = getConciseArrowBodyText(callbackResult.element, context);

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
		|| isKnownNonIndexedCollection(filterCallExpression.callee.object, context)
		|| wouldRemoveComments(context, callbackResult.arrayExpression, [callbackResult.element])
	) {
		return problem;
	}

	return {
		...problem,
		* fix(fixer) {
			yield fixer.replaceText(flatMapCallExpression.callee.property, 'map');
			yield fixer.replaceText(callbackResult.arrayExpression, getConciseArrowBodyText(callbackResult.element, context));
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
		const testText = getConciseArrowBodyText(callbackResult.test, context);

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

function isFlatMapCall(flatMapCallExpression, context) {
	if (
		!isMethodCall(flatMapCallExpression, {
			method: 'flatMap',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| isKnownNonIndexedCollection(flatMapCallExpression.callee.object, context)
	) {
		return false;
	}

	const filterCallExpression = flatMapCallExpression.callee.object;
	return !(isFilterCallExpression(filterCallExpression)
		&& isKnownNonIndexedCollection(filterCallExpression.callee.object, context));
}

function getProblem(flatMapCallExpression, context, isTypeScript) {
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

	if (isTypeScript) {
		return;
	}

	return getProblemForConditionalFlatMap(flatMapCallExpression, callback, callbackResult, context);
}

function getArrayWrapperProblem(node, context, isTypeScript) {
	const element = getSingleArrayElement(node);
	if (!element) {
		return;
	}

	let returnedExpression = node;
	while (
		returnedExpression.parent.type === 'ConditionalExpression'
		&& returnedExpression.parent.test !== returnedExpression
	) {
		returnedExpression = returnedExpression.parent;
	}

	let callback = returnedExpression.parent;
	if (callback.type === 'ReturnStatement') {
		while (callback && !isFunction(callback)) {
			callback = callback.parent;
		}
	}

	if (
		!callback
		|| !isFunction(callback)
		|| callback.async
		|| callback.generator
		|| callback.returnType
		|| callback.parent.type !== 'CallExpression'
		|| callback.parent.arguments[0] !== callback
		|| !isFlatMapCall(callback.parent, context)
		|| getProblem(callback.parent, context, isTypeScript)
		|| !isNonArrayValue(element, context)
	) {
		return;
	}

	const fix = function * (fixer, {abort}) {
		const {sourceCode} = context;
		if (wouldRemoveComments(context, node, [getParenthesizedRange(element, context)])) {
			return abort();
		}

		let replacement = node.parent.type === 'ArrowFunctionExpression' && !isParenthesized(node, context)
			? getConciseArrowBodyText(element, context)
			: getParenthesizedText(element, context);
		const previousToken = sourceCode.getTokenBefore(node);
		if (previousToken?.value === 'return' && sourceCode.getRange(previousToken)[1] === sourceCode.getRange(node)[0]) {
			replacement = ` ${replacement}`;
		}

		yield fixer.replaceText(node, replacement);
	};

	// Removing a wrapper can narrow TypeScript's inferred element type.
	return {
		node,
		messageId: MESSAGE_ID_ARRAY_WRAPPER,
		...(isTypeScript ? {suggest: [{messageId: SUGGESTION_ID_ARRAY_WRAPPER, fix}]} : {fix}),
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const isTypeScript = isTypeScriptFile(context.physicalFilename) || isTypeScriptVueSfc(context.sourceCode);
	context.on('CallExpression', callExpression =>
		isFlatMapCall(callExpression, context) ? getProblem(callExpression, context, isTypeScript) : undefined,
	);
	context.on('ArrayExpression', node => getArrayWrapperProblem(node, context, isTypeScript));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary use of `Array#flatMap()`.',
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
