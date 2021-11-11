'use strict';

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

const create = context => {
	const filename = context.getPhysicalFilename().toLowerCase();

	if (!/\.(?:js|mjs|cjs|ts|mts|cts)$/.test(filename)) {
		return {};
	}

	return {
		Program(node) {
			if (!isEmpty(node)) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
			};
		},
	};
};

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
		},
		schema: [],
		messages,
	},
};
