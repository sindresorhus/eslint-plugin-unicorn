'use strict';

const MESSAGE_ID = 'prefer-event-target';
const messages = {
	[MESSAGE_ID]: 'Prefer `EventTarget` over `EventEmitter`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	Identifier(node) {
		if (!(
			node.name === 'EventEmitter'
			&& (
				(
					(node.parent.type === 'ClassDeclaration' || node.parent.type === 'ClassExpression')
					&& node.parent.superClass === node
				)
				|| (node.parent.type === 'NewExpression' && node.parent.callee === node)
			)
		)) {
			return;
		}

		return {
			node,
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
			description: 'Prefer `EventTarget` over `EventEmitter`.',
		},
		messages,
	},
};
