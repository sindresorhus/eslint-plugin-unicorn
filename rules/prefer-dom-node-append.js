'use strict';
const {isMethodCall} = require('./ast/index.js');
const {isNodeValueNotDomNode, isValueNotUsable} = require('./utils/index.js');

const MESSAGE_ID = 'prefer-dom-node-append';
const messages = {
	[MESSAGE_ID]: 'Prefer `Node#append()` over `Node#appendChild()`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	CallExpression(node) {
		if (
			!isMethodCall(node, {
				method: 'appendChild',
				argumentsLength: 1,
				optionalCall: false,
			})
			|| isNodeValueNotDomNode(node.callee.object)
			|| isNodeValueNotDomNode(node.arguments[0])
		) {
			return;
		}

		const fix = isValueNotUsable(node)
			? fixer => fixer.replaceText(node.callee.property, 'append')
			: undefined;

		return {
			node,
			messageId: MESSAGE_ID,
			fix,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Node#append()` over `Node#appendChild()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
