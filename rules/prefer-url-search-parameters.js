import {findVariable} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isNewExpression,
	getStaticStringValue,
} from './ast/index.js';
import {
	getCallArgumentText,
	getParenthesizedRange,
	getCommentSafeProblem,
	getOutermostTypeScriptExpression,
	getFunctionReturnExpression,
	getStaticValueIfNoSideEffects,
	hasTypeArguments,
	isGlobalNameAvailable,
	isKnownNonString,
	isSameIdentifier,
	isTypeOnlyDefinition,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-url-search-parameters/error';
const MESSAGE_ID_SUGGESTION = 'prefer-url-search-parameters/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `URLSearchParams` over manually splitting query strings.',
	[MESSAGE_ID_SUGGESTION]: 'Use `{{replacement}}`.',
};

const urlImportSources = new Set([
	'node:url',
	'url',
]);

const isUrlSearchParametersImport = definition => {
	if (definition.type !== 'ImportBinding') {
		return false;
	}

	const {node, parent} = definition;
	return urlImportSources.has(parent.source.value)
		&& parent.importKind !== 'type'
		&& node.type === 'ImportSpecifier'
		&& node.importKind !== 'type'
		&& node.imported.type === 'Identifier'
		&& node.imported.name === 'URLSearchParams';
};

const isUrlSearchParametersAvailable = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), 'URLSearchParams');
	return !variable
		|| variable.defs.every(definition => isTypeOnlyDefinition(definition))
		|| variable.defs.some(definition => isUrlSearchParametersImport(definition));
};

const getStaticNumberValue = (node, context) =>
	getStaticValueIfNoSideEffects(node, context)?.value;

const isStaticString = (node, value) =>
	getStaticStringValue(unwrapTypeScriptExpression(node)) === value;

const isStaticNonString = (node, context) => {
	const staticValue = getStaticValueIfNoSideEffects(node, context);
	return Boolean(staticValue) && typeof staticValue.value !== 'string';
};

const getAmpersandSplitCall = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	if (!isMethodCall(node, {
		method: 'split',
		argumentsLength: 1,
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	if (
		!isStaticString(node.arguments[0], '&')
		|| isKnownNonString(node.callee.object, context)
		|| isStaticNonString(node.callee.object, context)
	) {
		return;
	}

	return node;
};

const isEqualsSplitCall = (node, parameter, context) => {
	node = unwrapTypeScriptExpression(node);

	if (!isMethodCall(node, {
		method: 'split',
		minimumArguments: 1,
		maximumArguments: 2,
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})) {
		return false;
	}

	if (!isSameIdentifier(unwrapTypeScriptExpression(node.callee.object), parameter)) {
		return false;
	}

	if (!isStaticString(node.arguments[0], '=')) {
		return false;
	}

	return node.arguments.length === 1 || getStaticNumberValue(node.arguments[1], context) === 2;
};

const getCallbackReturnExpression = callback => {
	if (
		(callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
		|| callback.async
		|| callback.generator
		|| callback.params.length !== 1
		|| callback.params[0].type !== 'Identifier'
	) {
		return;
	}

	return getFunctionReturnExpression(callback);
};

const getManualSearchParametersPipeline = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (
		!isMethodCall(node, {
			method: 'map',
			argumentsLength: 1,
			computed: false,
			optionalCall: false,
			optionalMember: false,
		})
		|| hasTypeArguments(node)
	) {
		return;
	}

	const splitCall = getAmpersandSplitCall(node.callee.object, context);
	if (!splitCall) {
		return;
	}

	const [callback] = node.arguments;
	const returnExpression = getCallbackReturnExpression(callback);
	if (!returnExpression || !isEqualsSplitCall(returnExpression, callback.params[0], context)) {
		return;
	}

	return {
		node,
		query: splitCall.callee.object,
	};
};

const getUrlSearchParametersText = (query, context) =>
	`new URLSearchParams(${getCallArgumentText(query, context)})`;

const getReplacementWithArgument = (node, argument, replacementArgument, context) => {
	const {sourceCode} = context;
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	const [argumentStart, argumentEnd] = getParenthesizedRange(argument, context);

	return sourceCode.text.slice(nodeStart, argumentStart)
		+ replacementArgument
		+ sourceCode.text.slice(argumentEnd, nodeEnd);
};

const getPreservedWrapperRanges = (node, argument, context) => {
	const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);
	const [argumentStart, argumentEnd] = getParenthesizedRange(argument, context);

	return [
		[nodeStart, argumentStart],
		[argumentEnd, nodeEnd],
	];
};

const createProblem = ({node, query, replacement, preservedNodes = [query]}, context) => {
	if (!isUrlSearchParametersAvailable(node, context)) {
		return;
	}

	return getCommentSafeProblem(context, {
		node,
		messageId: MESSAGE_ID_ERROR,
		suggest: [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {replacement},
				fix: fixer => fixer.replaceText(node, replacement),
			},
		],
	}, node, preservedNodes);
};

const isObjectFromEntriesCall = (node, context) =>
	isMethodCall(node, {
		object: 'Object',
		method: 'fromEntries',
		argumentsLength: 1,
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})
	&& isGlobalNameAvailable('Object', node, context);

const isMapConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'Map',
		argumentsLength: 1,
	})
	&& isGlobalNameAvailable('Map', node, context);

const isUrlSearchParametersConstructor = node =>
	isNewExpression(node, {
		name: 'URLSearchParams',
		argumentsLength: 1,
	});

const isPropertyNamed = (node, name, {computed}) =>
	computed
		? getStaticStringValue(node) === name
		: node.type === 'Identifier' && node.name === name;

const isPotentialObjectFromEntriesCall = node =>
	node.type === 'CallExpression'
	&& node.arguments.length === 1
	&& node.callee.type === 'MemberExpression'
	&& node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'Object'
	&& isPropertyNamed(node.callee.property, 'fromEntries', {computed: node.callee.computed});

const isPotentialWrapper = node =>
	isPotentialObjectFromEntriesCall(node)
	|| isNewExpression(node, {
		names: [
			'Map',
			'URLSearchParams',
		],
		argumentsLength: 1,
	});

const getFirstArgumentParent = node => {
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;
	return parent?.arguments?.[0] === expression ? parent : undefined;
};

const isWrappedPipeline = node => {
	const parent = getFirstArgumentParent(node);
	return parent && isPotentialWrapper(parent);
};

const getObjectFromEntriesProblem = (node, context) => {
	if (!isObjectFromEntriesCall(node, context)) {
		return;
	}

	const [argument] = node.arguments;
	const pipeline = getManualSearchParametersPipeline(argument, context);
	if (!pipeline) {
		return;
	}

	const replacement = getReplacementWithArgument(node, argument, getUrlSearchParametersText(pipeline.query, context), context);
	return createProblem({
		node,
		query: pipeline.query,
		replacement,
		preservedNodes: [
			...getPreservedWrapperRanges(node, argument, context),
			pipeline.query,
		],
	}, context);
};

const getNewExpressionProblem = (node, context) => {
	const isMap = isMapConstructor(node, context);
	if (!isMap && !isUrlSearchParametersConstructor(node)) {
		return;
	}

	const [argument] = node.arguments;
	const pipeline = getManualSearchParametersPipeline(argument, context);
	if (!pipeline) {
		return;
	}

	const queryText = getCallArgumentText(pipeline.query, context);
	const urlSearchParametersText = getUrlSearchParametersText(pipeline.query, context);
	const replacementArgument = isMap ? urlSearchParametersText : queryText;
	const replacement = getReplacementWithArgument(node, argument, replacementArgument, context);

	return createProblem({
		node,
		query: pipeline.query,
		replacement,
		preservedNodes: [
			...getPreservedWrapperRanges(node, argument, context),
			pipeline.query,
		],
	}, context);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		const objectFromEntriesProblem = getObjectFromEntriesProblem(node, context);
		if (objectFromEntriesProblem) {
			return objectFromEntriesProblem;
		}

		if (isWrappedPipeline(node)) {
			return;
		}

		const pipeline = getManualSearchParametersPipeline(node, context);
		if (!pipeline) {
			return;
		}

		return createProblem({
			node,
			query: pipeline.query,
			replacement: getUrlSearchParametersText(pipeline.query, context),
		}, context);
	});

	context.on('NewExpression', node => getNewExpressionProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `URLSearchParams` over manually splitting query strings.',
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
