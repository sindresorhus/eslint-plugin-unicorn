'use strict';
const MESSAGE_ID = 'no-this-assignment';
const messages = {
	[MESSAGE_ID]: 'Do not assign `this` to `{{name}}`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	'VariableDeclarator,AssignmentExpression'(node) {
		const variableNode = node.type === 'AssignmentExpression' ? node.left : node.id;
		const valueNode = node.type === 'AssignmentExpression' ? node.right : node.init;

		if (
			variableNode.type !== 'Identifier'
			|| valueNode?.type !== 'ThisExpression'
		) {
			return;
		}

		return {
			node,
			data: {name: variableNode.name},
			messageId: MESSAGE_ID,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow assigning `this` to a variable.',
		},
		messages,
	},
};
