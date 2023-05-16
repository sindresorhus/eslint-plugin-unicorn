'use strict';
const {isMethodCall} = require('./ast/index.js');

const MESSAGE_ID = 'error';
const messages = {
	[MESSAGE_ID]: 'Prefer `Blob#{{method}}()` over `FileReader#{{replacement}}(blob)`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	CallExpression(node) {
		if (!isMethodCall({
			methods: ['readAsText', 'readAsArrayBuffer'],
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const method = node.callee.property;
		const methodName = method.name;

		return {
			node: method,
			messageId: MESSAGE_ID,
			data: {
				method: methodName,
				replacement: methodName === 'readAsArrayBuffer' ? 'readAsArrayBuffer' : 'text',
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(…)` and `Blob#text()` over `FileReader#readAsText(…)`.',
		},
		messages,
	},
};
