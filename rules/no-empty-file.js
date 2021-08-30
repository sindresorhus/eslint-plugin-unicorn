'use strict';
const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const create = () => ({
	Program(node) {
		const isEmpty = (currentNode) =>
			currentNode.type === 'EmptyStatement'
			|| (currentNode.type === 'ExpressionStatement' && currentNode.expression.value === 'use strict')
			|| currentNode.type === 'BlockStatement' && currentNode.body.every(isEmpty);

		if (node.body.every(isEmpty)) {
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
