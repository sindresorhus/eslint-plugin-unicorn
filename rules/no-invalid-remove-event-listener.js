'use strict';
const {getFunctionHeadLocation} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const {methodCallSelector, matches} = require('./selectors');

const MESSAGE_ID = 'no-invalid-remove-event-listener';
const messages = {
	[MESSAGE_ID]: 'The listener argument should be a function reference.'
};

const removeEventListenerSelector = [
	methodCallSelector({
		name: 'removeEventListener',
		min: 2
	}),
	'[arguments.0.type!="SpreadElement"]',
	matches([
		'[arguments.1.type="FunctionExpression"]',
		'[arguments.1.type="ArrowFunctionExpression"]',
		methodCallSelector({name: 'bind', path: 'arguments.1'})
	])
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[removeEventListenerSelector]: node => {
			const listener = node.arguments[1];
			if (['ArrowFunctionExpression', 'FunctionExpression'].includes(listener.type)) {
				context.report({
					node: listener,
					loc: getFunctionHeadLocation(listener, context.getSourceCode()),
					messageId: MESSAGE_ID
				});
			} else {
				context.report({
					node: listener.callee.property,
					messageId: MESSAGE_ID
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent calling `EventTarget#removeEventListener()` with the result of an expression',
			url: getDocumentationUrl(__filename)
		},
		schema: [],
		messages
	}
};
