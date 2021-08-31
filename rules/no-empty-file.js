'use strict';
const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const isEmpty = node =>
	node.type === 'EmptyStatement'
	|| (node.type === 'ExpressionStatement' && 'directive' in node)
	|| (node.type === 'BlockStatement' && node.body.every(currentNode => isEmpty(currentNode)));

const create = () => ({
	Program(node) {
		if (node.body.every(currentNode => isEmpty(currentNode))) {
			return {
				node,
				messageId: MESSAGE_ID,
			};
		}
	},
});

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
		},
		schema,
		messages,
	},
};
