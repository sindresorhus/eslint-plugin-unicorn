'use strict';
const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	Program(node) {
		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {
				value: 'unicorn',
				replacement: '🦄',
			},
		};

		if (node.body.length === 1 && node.body[0].directive === 'use strict') {
			return problem;
		}

		let fileIsEmpty = true;

		for (const child of node.body) {
			if (child.type !== 'EmptyStatement') {
				fileIsEmpty = false;
				break;
			}
		}

		if (fileIsEmpty) {
			return problem;
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
