import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isNewExpression,
	getStaticStringValue,
} from './ast/index.js';
import {
	getParenthesizedText,
	isKnownNonString,
	isSameIdentifier,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
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

const isTypeOnlyImport = definition =>
	definition.type === 'ImportBinding'
	&& (
		definition.parent.importKind === 'type'
		|| definition.node.importKind === 'type'
	);

const isErasedDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImport(definition);

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

const isGlobalNameAvailable = (name, node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), name);
	return !variable || variable.defs.every(definition => isErasedDefinition(definition));
};

const isUrlSearchParametersAvailable = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), 'URLSearchParams');
	return !variable
		|| variable.defs.every(definition => isErasedDefinition(definition))
		|| variable.defs.some(definition => isUrlSearchParametersImport(definition));
};

const getStaticNumberValue = (node, context) =>
	getStaticValue(node, context.sourceCode.getScope(node))?.value;

const isStaticString = (node, value) =>
	getStaticStringValue(unwrapTypeScriptExpression(node)) === value;

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

	if (callback.body.type !== 'BlockStatement') {
		return {
			parameter: callback.params[0],
			returnExpression: callback.body,
		};
	}

	if (
		callback.body.body.length !== 1
		|| callback.body.body[0].type !== 'ReturnStatement'
		|| !callback.body.body[0].argument
	) {
		return;
	}

	return {
		parameter: callback.params[0],
		returnExpression: callback.body.body[0].argument,
	};
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
		|| node.typeArguments
		|| node.typeParameters
	) {
		return;
	}

	const splitCall = getAmpersandSplitCall(node.callee.object, context);
	if (!splitCall) {
		return;
	}

	const [callback] = node.arguments;
	const result = getCallbackReturnExpression(callback);
	if (!result || !isEqualsSplitCall(result.returnExpression, result.parameter, context)) {
		return;
	}

	return {
		node,
		query: splitCall.callee.object,
	};
};

const getUrlSearchParametersText = (query, context) =>
	`new URLSearchParams(${getParenthesizedText(query, context)})`;

const getReplacementWithArgument = (node, argument, replacementArgument, context) =>
	context.sourceCode.text.slice(context.sourceCode.getRange(node)[0], context.sourceCode.getRange(argument)[0])
	+ replacementArgument
	+ context.sourceCode.text.slice(context.sourceCode.getRange(argument)[1], context.sourceCode.getRange(node)[1]);

const getSuggestion = ({node, query, replacement, preservedNodes}, context) => {
	if (
		!isUrlSearchParametersAvailable(node, context)
		|| wouldRemoveComments(context, node, preservedNodes)
	) {
		return;
	}

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			data: {replacement},
			fix: fixer => fixer.replaceText(node, replacement),
		},
	];
};

const createProblem = ({node, query, replacement, preservedNodes = [query]}, context) => {
	const suggest = getSuggestion({
		node,
		query,
		replacement,
		preservedNodes,
	}, context);
	if (!suggest) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_ERROR,
		suggest,
	};
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

const isUrlSearchParametersConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'URLSearchParams',
		argumentsLength: 1,
	})
	&& isUrlSearchParametersAvailable(node, context);

const isSupportedWrapper = (node, context) =>
	(node.type === 'CallExpression' && isObjectFromEntriesCall(node, context))
	|| (node.type === 'NewExpression' && (isMapConstructor(node, context) || isUrlSearchParametersConstructor(node, context)));

const isPotentialWrapper = node =>
	(
		node.type === 'CallExpression'
		&& isMethodCall(node, {
			object: 'Object',
			method: 'fromEntries',
			argumentsLength: 1,
			computed: false,
			optionalCall: false,
			optionalMember: false,
		})
	)
	|| (
		node.type === 'NewExpression'
		&& (
			isNewExpression(node, {
				name: 'Map',
				argumentsLength: 1,
			})
			|| isNewExpression(node, {
				name: 'URLSearchParams',
				argumentsLength: 1,
			})
		)
	);

const getFirstArgumentParent = node => {
	let expression = node;
	let {parent} = node;
	while (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === expression
	) {
		expression = parent;
		parent = parent.parent;
	}

	return parent?.arguments?.[0] === expression ? parent : undefined;
};

const isWrappedPipeline = (node, context) => {
	const parent = getFirstArgumentParent(node);
	return parent && (isSupportedWrapper(parent, context) || isPotentialWrapper(parent));
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
			node.callee,
			pipeline.query,
		],
	}, context);
};

const getNewExpressionProblem = (node, context) => {
	if (!isMapConstructor(node, context) && !isUrlSearchParametersConstructor(node, context)) {
		return;
	}

	const [argument] = node.arguments;
	const pipeline = getManualSearchParametersPipeline(argument, context);
	if (!pipeline) {
		return;
	}

	const queryText = getParenthesizedText(pipeline.query, context);
	const urlSearchParametersText = getUrlSearchParametersText(pipeline.query, context);
	const replacementArgument = isMapConstructor(node, context) ? urlSearchParametersText : queryText;
	const replacement = getReplacementWithArgument(node, argument, replacementArgument, context);

	return createProblem({
		node,
		query: pipeline.query,
		replacement,
		preservedNodes: [
			node.callee,
			pipeline.query,
		],
	}, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		const objectFromEntriesProblem = getObjectFromEntriesProblem(node, context);
		if (objectFromEntriesProblem) {
			return objectFromEntriesProblem;
		}

		if (isWrappedPipeline(node, context)) {
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

/** @type {import('eslint').Rule.RuleModule} */
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
