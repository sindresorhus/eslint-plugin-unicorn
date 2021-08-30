'use strict';
const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const create = () => ({
	Program(node) {
		const isEmpty = (currentValue) =>
			currentValue.type === 'EmptyStatement'
			|| (currentValue.type === 'ExpressionStatement' && currentValue.expression.value === 'use strict');

		if (node.body.every(isEmpty)) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},
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
