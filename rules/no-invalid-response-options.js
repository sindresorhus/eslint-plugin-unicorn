import {getPropertyName} from '@eslint-community/eslint-utils';
import {isNewExpression, isMethodCall, isUndefinedValue} from './ast/index.js';
import {getConstVariableInitializer, getStaticValueForControlFlow, unwrapTypeScriptExpression} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_STATUS = 'invalid-status';
const MESSAGE_ID_BODY = 'body-with-null-body-status';
const MESSAGE_ID_REDIRECT = 'invalid-redirect-status';
const MESSAGE_ID_REMOVE_BODY = 'remove-body';
const messages = {
	[MESSAGE_ID_STATUS]: 'Response status must be in the range 200 to 599.',
	[MESSAGE_ID_BODY]: 'A response with status {{status}} cannot have a body.',
	[MESSAGE_ID_REDIRECT]: '`Response.redirect()` status must be 301, 302, 303, 307, or 308.',
	[MESSAGE_ID_REMOVE_BODY]: 'Replace the response body with `undefined`.',
};

const nullBodyStatuses = new Set([204, 205, 304]);
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const nonNullishExpressionTypes = new Set([
	'TemplateLiteral',
	'ObjectExpression',
	'ArrayExpression',
	'NewExpression',
]);

const isPrimitiveLiteral = node => node.type === 'Literal' && !node.regex;
const isPrimitiveGlobal = node => node.type === 'Identifier' && ['undefined', 'NaN', 'Infinity'].includes(node.name);

/**
Get a simple static value without trusting object coercion in compound expressions or constant initializers.
*/
function getStaticValue(node, context) {
	node = unwrapTypeScriptExpression(node);
	const expression = unwrapTypeScriptExpression(getConstVariableInitializer(node, context) ?? node);
	if (
		!['Literal', 'ObjectExpression', 'ArrayExpression'].includes(expression.type)
		&& !isPrimitiveGlobal(expression)
		&& !(
			expression.type === 'UnaryExpression'
			&& (isPrimitiveLiteral(expression.argument) || isPrimitiveGlobal(expression.argument))
		)
		&& !(
			expression.type === 'TemplateLiteral'
			&& expression.expressions.every(expression => isPrimitiveLiteral(expression))
		)
	) {
		return;
	}

	return getStaticValueForControlFlow(node, context);
}

/**
Get the effective status property of an inline options object, unless a later property could override it.
*/
function getStatusProperty(node, context) {
	node = unwrapTypeScriptExpression(node);
	if (node.type !== 'ObjectExpression') {
		return;
	}

	for (let index = node.properties.length - 1; index >= 0; index--) {
		const property = node.properties[index];
		if (property.type !== 'Property') {
			return;
		}

		const name = property.computed
			? getStaticValue(property.key, context)?.value
			: getPropertyName(property);
		if (property.computed && typeof name !== 'string' && typeof name !== 'number') {
			return;
		}

		if (name === 'status') {
			return property.kind === 'init' && !property.method ? property : undefined;
		}
	}
}

/**
Get a known primitive status after Web IDL unsigned short conversion, without invoking user-defined coercion.
*/
function getStatus(node, context, defaultStatus) {
	node = unwrapTypeScriptExpression(node);
	if (isUndefinedValue(node)) {
		return defaultStatus;
	}

	const result = getStaticValue(node, context);
	if (!result) {
		return;
	}

	const {value} = result;
	if (value === undefined) {
		return defaultStatus;
	}

	if (value !== null && !['number', 'string', 'boolean'].includes(typeof value)) {
		return;
	}

	const number = Number(value);
	if (!Number.isFinite(number)) {
		return 0;
	}

	// Web IDL truncates fractions and wraps unsigned short values modulo 2 ** 16.
	return ((Math.trunc(number) % 65_536) + 65_536) % 65_536;
}

/**
Get a problem for a proven non-nullish constructor body, with a suggestion when its evaluation can safely be removed.
*/
function getBodyProblem(node, status, context) {
	const body = unwrapTypeScriptExpression(node);
	const result = getStaticValue(body, context);
	if (
		!nonNullishExpressionTypes.has(body.type)
		&& (!result || result.value === null || result.value === undefined)
	) {
		return;
	}

	const problem = {
		node,
		messageId: MESSAGE_ID_BODY,
		data: {status},
	};

	// Only simple primitive values avoid user-defined string conversion during body extraction.
	if (
		!result
		|| !['string', 'number', 'boolean', 'bigint'].includes(typeof result.value)
		|| context.sourceCode.getCommentsInside(node).length > 0
	) {
		return problem;
	}

	problem.suggest = [{
		messageId: MESSAGE_ID_REMOVE_BODY,
		fix: fixer => fixer.replaceText(node, 'undefined'),
	}];
	return problem;
}

/**
Get a status or body compatibility problem for Response construction.
*/
function getResponseProblem(node, context) {
	const property = getStatusProperty(node.arguments[1], context);
	if (!property) {
		return;
	}

	const status = getStatus(property.value, context, 200);
	if (status === undefined) {
		return;
	}

	if (status < 200 || status > 599) {
		return {node: property.value, messageId: MESSAGE_ID_STATUS};
	}

	if (!nullBodyStatuses.has(status)) {
		return;
	}

	return node.type === 'NewExpression'
		? getBodyProblem(node.arguments[0], status, context)
		: {node: property.value, messageId: MESSAGE_ID_BODY, data: {status}};
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', node => {
		if (
			!isNewExpression(node, {name: 'Response', minimumArguments: 2})
			|| node.arguments.slice(0, 2).some(argument => argument.type === 'SpreadElement')
		) {
			return;
		}

		return getResponseProblem(node, context);
	});

	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				object: 'Response',
				methods: ['json', 'redirect'],
				minimumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
			|| node.arguments.slice(0, 2).some(argument => argument.type === 'SpreadElement')
		) {
			return;
		}

		if (node.callee.property.name === 'json') {
			return getResponseProblem(node, context);
		}

		const status = getStatus(node.arguments[1], context, 302);
		if (status !== undefined && !redirectStatuses.has(status)) {
			return {node: node.arguments[1], messageId: MESSAGE_ID_REDIRECT};
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid options in `new Response()`, `Response.json()`, and `Response.redirect()`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
