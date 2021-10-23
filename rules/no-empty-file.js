'use strict';
const {checkVueTemplate} = require('./utils/rule.js');

const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const isEmpty = node =>
	(
		(node.type === 'Program' || node.type === 'BlockStatement')
		&& node.body.every(currentNode => isEmpty(currentNode))
	)
	|| node.type === 'EmptyStatement'
	|| (node.type === 'ExpressionStatement' && 'directive' in node);

const create = () => ({
	Program(node) {
		if (!isEmpty(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	},
});

module.exports = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
		},
		schema: [],
		messages,
	},
};
