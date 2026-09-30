import {getFunctionHeadLocation, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-invalid-remove-event-listener';
const messages = {
	[MESSAGE_ID]: 'The listener argument should be a function reference.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!(
			isMethodCall(callExpression, {
				method: 'removeEventListener',
				minimumArguments: 2,
				optionalCall: false,
			})
			&& callExpression.arguments[0].type !== 'SpreadElement'
		)) {
			return;
		}

		const [, listener] = callExpression.arguments;
		if (['ArrowFunctionExpression', 'FunctionExpression'].includes(listener.type)) {
			return {
				node: listener,
				loc: getFunctionHeadLocation(listener, context.sourceCode),
				messageId: MESSAGE_ID,
			};
		}

		// `this.handler['bind'](this)` is the same call as `this.handler.bind(this)`
		if (
			listener.type === 'CallExpression'
			&& !listener.optional
			&& listener.callee.type === 'MemberExpression'
			&& !listener.callee.optional
			&& getPropertyName(listener.callee) === 'bind'
		) {
			return {
				node: listener.callee.property,
				messageId: MESSAGE_ID,
			};
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent calling `EventTarget#removeEventListener()` with the result of an expression.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
