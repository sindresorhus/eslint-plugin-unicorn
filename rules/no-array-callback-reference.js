import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	isNodeMatches,
	isNodeValueNotFunction,
	isParenthesized,
	getParenthesizedRange,
	getParenthesizedText,
	shouldAddParenthesesToCallExpressionCallee,
	singular,
} from './utils/index.js';

const ERROR_WITH_NAME_MESSAGE_ID = 'error-with-name';
const ERROR_WITHOUT_NAME_MESSAGE_ID = 'error-without-name';
const REPLACE_WITH_NAME_MESSAGE_ID = 'replace-with-name';
const REPLACE_WITHOUT_NAME_MESSAGE_ID = 'replace-without-name';
const {
	isIdentifierName,
	isKeyword,
	isStrictBindReservedWord,
} = helperValidatorIdentifier;
const messages = {
	[ERROR_WITH_NAME_MESSAGE_ID]: 'Do not pass function `{{name}}` directly to `.{{method}}(…)`.',
	[ERROR_WITHOUT_NAME_MESSAGE_ID]: 'Do not pass function directly to `.{{method}}(…)`.',
	[REPLACE_WITH_NAME_MESSAGE_ID]: 'Replace function `{{name}}` with `… => {{name}}({{parameters}})`.',
	[REPLACE_WITHOUT_NAME_MESSAGE_ID]: 'Replace function with `… => …({{parameters}})`.',
};

const isAwaitExpressionArgument = node => node.parent.type === 'AwaitExpression' && node.parent.argument === node;

const iteratorMethods = new Map([
	{
		method: 'every',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'filter',
		shouldIgnoreCallExpression: node => (node.callee.object.type === 'Identifier' && node.callee.object.name === 'Vue'),
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'find',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLast',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'findLastIndex',
		ignore: [
			'Boolean',
		],
	},
	{
		method: 'flatMap',
	},
	{
		method: 'forEach',
		returnsUndefined: true,
	},
	{
		method: 'map',
		shouldIgnoreCallExpression: node => (node.callee.object.type === 'Identifier' && node.callee.object.name === 'types'),
		ignore: [
			'String',
			'Number',
			'BigInt',
			'Boolean',
			'Symbol',
		],
	},
	{
		method: 'reduce',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'reduceRight',
		parameters: [
			'accumulator',
			'element',
			'index',
			'array',
		],
		minParameters: 2,
	},
	{
		method: 'some',
		ignore: [
			'Boolean',
		],
	},
].map(({
	method,
	parameters = ['element', 'index', 'array'],
	ignore = [],
	minParameters = 1,
	returnsUndefined = false,
	shouldIgnoreCallExpression,
}) => [method, {
	minParameters,
	parameters,
	returnsUndefined,
	shouldIgnoreCallExpression(callExpression, ignoredCallees) {
		if (
			method !== 'reduce'
			&& method !== 'reduceRight'
			&& isAwaitExpressionArgument(callExpression)
		) {
			return true;
		}

		if (isNodeMatches(callExpression.callee.object, ignoredCallees)) {
			return true;
		}

		if (
			callExpression.callee.object.type === 'CallExpression'
			&& isNodeMatches(callExpression.callee.object.callee, ignoredCallees)
		) {
			return true;
		}

		return shouldIgnoreCallExpression?.(callExpression) ?? false;
	},
	shouldIgnoreCallback(callback) {
		if (callback.type === 'Identifier' && ignore.includes(callback.name)) {
			return true;
		}

		return false;
	},
}]));

const defaultIgnoredCallees = [
	// https://bluebirdjs.com/docs/api/promise.map.html
	'Promise',
	'React.Children',
	'Children',
	'lodash',
	'underscore',
	'_',
	'Async',
	'async',
	'this',
	'$',
	'jQuery',
];

const isValidParameterName = name =>
	isIdentifierName(name)
	&& !isKeyword(name)
	&& !isStrictBindReservedWord(name, true);

function getSuggestionParameters(callExpression, callback, parameters) {
	if (callback.type !== 'Identifier') {
		return parameters;
	}

	let suggestionParameters = parameters;
	const {object} = callExpression.callee;
	if (object.type === 'Identifier') {
		const elementName = singular(object.name);
		if (elementName) {
			suggestionParameters = parameters.map(parameter => {
				let replacement;
				if (parameter === 'element') {
					replacement = elementName;
				} else if (parameter === 'array') {
					replacement = object.name;
				}

				return replacement
					&& !parameters.includes(replacement)
					&& replacement !== callback.name
					&& isValidParameterName(replacement)
					? replacement
					: parameter;
			});
		}
	}

	return suggestionParameters.map(parameter => parameter === callback.name ? `${parameter}_` : parameter);
}

function getProblem(context, node, callExpression, options) {
	const {type} = node;

	const name = type === 'Identifier' ? node.name : '';

	const problem = {
		node,
		messageId: name ? ERROR_WITH_NAME_MESSAGE_ID : ERROR_WITHOUT_NAME_MESSAGE_ID,
		data: {
			name,
			method: callExpression.callee.property.name,
		},
	};

	if (node.type === 'YieldExpression' || node.type === 'AwaitExpression') {
		return problem;
	}

	problem.suggest = [];

	const {minParameters, returnsUndefined} = options;
	const parameters = getSuggestionParameters(callExpression, node, options.parameters);
	for (let parameterLength = minParameters; parameterLength <= parameters.length; parameterLength++) {
		const suggestionParameters = parameters.slice(0, parameterLength).join(', ');

		const suggest = {
			messageId: name ? REPLACE_WITH_NAME_MESSAGE_ID : REPLACE_WITHOUT_NAME_MESSAGE_ID,
			data: {
				name,
				parameters: suggestionParameters,
			},
			fix(fixer) {
				let text = getParenthesizedText(node, context);

				if (
					!isParenthesized(node, context)
					&& shouldAddParenthesesToCallExpressionCallee(node)
				) {
					text = `(${text})`;
				}

				return fixer.replaceTextRange(
					getParenthesizedRange(node, context),
					returnsUndefined
						? `(${suggestionParameters}) => { ${text}(${suggestionParameters}); }`
						: `(${suggestionParameters}) => ${text}(${suggestionParameters})`,
				);
			},
		};

		problem.suggest.push(suggest);
	}

	return problem;
}

function * getTernaryConsequentAndALternate(node) {
	if (node.type === 'ConditionalExpression') {
		yield * getTernaryConsequentAndALternate(node.consequent);
		yield * getTernaryConsequentAndALternate(node.alternate);
		return;
	}

	yield node;
}

// These methods have dedicated type-predicate overloads in TypeScript's lib files.
// Wrapping a type guard can lose narrowing, so direct references should be allowed here.
const methodsWithTypePredicateOverloads = new Set([
	'every',
	'filter',
	'find',
	'findLast',
]);

function hasTypePredicateReturnType(node) {
	return node.returnType?.typeAnnotation?.type === 'TSTypePredicate';
}

function hasTypePredicateFunctionType(node) {
	return node.typeAnnotation?.typeAnnotation?.returnType?.typeAnnotation?.type === 'TSTypePredicate';
}

function isTypePredicateCallback(callback, context) {
	if (callback.type !== 'Identifier') {
		return false;
	}

	// Keep this local and syntax-based. Imported/member expressions need type-aware linting.
	const variable = findVariable(context.sourceCode.getScope(callback), callback);
	const definition = variable?.defs[0];

	if (!definition) {
		return false;
	}

	if (definition.type === 'FunctionName') {
		return hasTypePredicateReturnType(definition.node);
	}

	// Imported callbacks may be type guards, but we can't inspect their predicate return
	// type without type-aware linting. Be conservative on methods with predicate overloads.
	if (definition.type === 'ImportBinding') {
		return true;
	}

	if (definition.type === 'Parameter') {
		return hasTypePredicateFunctionType(definition.name);
	}

	if (definition.type === 'Variable') {
		if (hasTypePredicateFunctionType(definition.node.id)) {
			return true;
		}

		const {init} = definition.node;
		return init
			&& (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
			&& hasTypePredicateReturnType(init);
	}

	return false;
}

function shouldIgnoreCallback(callback, methodName, options, context) {
	return callback.type === 'FunctionExpression'
		|| callback.type === 'ArrowFunctionExpression'
		// Ignore all `CallExpression`s, including `function.bind()`
		|| callback.type === 'CallExpression'
		|| options.shouldIgnoreCallback(callback)
		|| isNodeValueNotFunction(callback)
		|| (methodsWithTypePredicateOverloads.has(methodName) && isTypePredicateCallback(callback, context));
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {ignore} = context.options[0];
	const ignoredCallees = [...defaultIgnoredCallees, ...ignore];

	context.on('CallExpression', function * (callExpression) {
		if (
			!isMethodCall(callExpression, {
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				computed: false,
			})
			|| callExpression.callee.property.type !== 'Identifier'
		) {
			return;
		}

		const methodNode = callExpression.callee.property;
		const methodName = methodNode.name;
		if (!iteratorMethods.has(methodName)) {
			return;
		}

		const options = iteratorMethods.get(methodName);
		if (options.shouldIgnoreCallExpression(callExpression, ignoredCallees)) {
			return;
		}

		const callbackArgument = callExpression.arguments[0];
		const callbacks = [...getTernaryConsequentAndALternate(callbackArgument)];
		const reportableCallbacks = callbacks.filter(callback => !shouldIgnoreCallback(callback, methodName, options, context));

		for (const callback of reportableCallbacks) {
			yield getProblem(context, callback, callExpression, options);
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true,
				items: {type: 'string'},
				description: 'Callees to ignore.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent passing a function reference directly to iterator methods.',
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{ignore: []}],
		messages,
	},
};

export default config;
