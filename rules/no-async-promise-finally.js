import {getPropertyName} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';
import {
	getFunctionFromIdentifier,
	isPromiseType,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

const MESSAGE_ID = 'no-async-promise-finally';
const messages = {
	[MESSAGE_ID]: 'Do not pass an async function to `Promise#finally()`.',
};

function isPromiseObject(node, context) {
	return withTypeInformation(node, context, ({type, checker}) => isPromiseType(type, checker));
}

function isAsyncFinallyCallback(node, context) {
	node = unwrapTypeScriptExpression(node);
	const callback = getFunctionFromIdentifier(node, context) ?? node;
	return isFunction(callback)
		&& callback.async
		&& !callback.generator;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		const {callee} = callExpression;
		if (callee.type !== 'MemberExpression') {
			return;
		}

		const method = getPropertyName(callee, context.sourceCode.getScope(callExpression));
		if (method !== 'finally') {
			return;
		}

		const promiseObject = isPromiseObject(callee.object, context);
		if (promiseObject === false) {
			return;
		}

		const [callback] = callExpression.arguments;
		if (!callback || !isAsyncFinallyCallback(callback, context)) {
			return;
		}

		return {
			node: callback,
			messageId: MESSAGE_ID,
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
			description: 'Disallow async functions as `Promise#finally()` callbacks.',
			recommended: false,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
