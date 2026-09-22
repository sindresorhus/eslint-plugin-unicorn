import {isCallExpression, isNewExpression} from './ast/index.js';
import {isGlobalIdentifier, wouldRemoveComments} from './utils/index.js';

const messages = {
	resolve: 'Prefer `Promise.resolve()` over a trivial `new Promise()`.',
	reject: 'Prefer `Promise.reject()` over a trivial `new Promise()`.',
};

const getOnlyExpression = executor => {
	if (executor.body.type !== 'BlockStatement') {
		return executor.body;
	}

	const [statement] = executor.body.body;
	return executor.body.body.length === 1 && statement.type === 'ExpressionStatement'
		? statement.expression
		: undefined;
};

const isSimpleValue = node => node.type === 'Identifier'
	|| node.type === 'Literal'
	|| (node.type === 'TemplateLiteral' && node.expressions.length === 0);

const isSupportedExecutor = executor => (
	(executor.type === 'ArrowFunctionExpression' || executor.type === 'FunctionExpression')
	&& !executor.async
	&& !executor.generator
	&& executor.params.length > 0
	&& executor.params.length <= 2
	&& executor.params.every(parameter => parameter.type === 'Identifier' && parameter.name !== 'this')
	&& (executor.params.length === 1 || executor.params[0].name !== executor.params[1].name)
);

const getMethod = (callExpression, parameters) => {
	if (
		!isCallExpression(callExpression, {maximumArguments: 1, optional: false})
		|| callExpression.callee.type !== 'Identifier'
	) {
		return;
	}

	const {name} = callExpression.callee;
	if (name === parameters[0].name) {
		return 'resolve';
	}

	if (parameters.length === 2 && name === parameters[1].name) {
		return 'reject';
	}
};

const getFix = (newExpression, callExpression, method, context) => {
	const {sourceCode} = context;
	const [executor] = newExpression.arguments;
	const [value] = callExpression.arguments;
	const typeArguments = newExpression.typeArguments ?? newExpression.typeParameters;

	if (
		executor.params.some(parameter => parameter.typeAnnotation)
		|| executor.returnType
		|| executor.typeParameters
		|| (typeArguments && method === 'resolve')
		|| wouldRemoveComments(context, newExpression, value ? [value] : [])
	) {
		return;
	}

	const typeArgumentsText = typeArguments ? sourceCode.getText(typeArguments) : '';
	const valueText = value ? sourceCode.getText(value) : '';
	return fixer => fixer.replaceText(newExpression, `Promise.${method}${typeArgumentsText}(${valueText})`);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', newExpression => {
		if (
			!isNewExpression(newExpression, {name: 'Promise', argumentsLength: 1})
			|| !isGlobalIdentifier(newExpression.callee, context)
		) {
			return;
		}

		const [executor] = newExpression.arguments;
		if (!isSupportedExecutor(executor)) {
			return;
		}

		const callExpression = getOnlyExpression(executor);
		const method = callExpression && getMethod(callExpression, executor.params);
		if (!method) {
			return;
		}

		const [value] = callExpression.arguments;
		if (
			value
			&& (
				!isSimpleValue(value)
				|| (value.type === 'Identifier' && (
					(value.name === 'arguments' && executor.type === 'FunctionExpression')
					|| executor.id?.name === value.name
					|| executor.params.some(parameter => parameter.name === value.name)
				))
			)
		) {
			return;
		}

		return {
			node: newExpression,
			messageId: method,
			fix: getFix(newExpression, callExpression, method, context),
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Promise.resolve()` and `Promise.reject()` over trivial `new Promise()` calls.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
