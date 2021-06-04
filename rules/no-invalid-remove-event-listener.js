'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {methodCallSelector, matches} = require('./selectors');

const MESSAGE_ID = 'no-invalid-remove-event-listener';
const messages = {
	[MESSAGE_ID]: 'The listener argument should be a function reference.'
};

const isBindCall = node =>
	node.type === 'CallExpression' &&
	node.callee.type === 'MemberExpression' &&
	node.callee.property.name === 'bind' &&
	!node.callee.computed;

const removeEventListenerSelector = [
	methodCallSelector({
		name: 'removeEventListener',
		min: 2
	}),
	matches([
		'[arguments.1.type="FunctionExpression"]',
		'[arguments.1.type="ArrowFunctionExpression"]',
		methodCallSelector({name: 'bind', path: 'arguments.1'})
	])
].join('')

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[removeEventListenerSelector]: node => {
			context.report({
				node: node.arguments[1],
				messageId: MESSAGE_ID
			});
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
