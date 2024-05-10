'use strict';
const {isEmptyNode, isDirective} = require('./ast/index.js');

const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const isEmpty = node => isEmptyNode(node, isDirective);

const isTripleSlashDirective = node =>
	node.type === 'Line' && node.value.startsWith('/');

const hasTripeSlashDirectives = comments =>
	comments.some(currentNode => isTripleSlashDirective(currentNode));

const isAllowComments = option => option.allow.includes('comments');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const filename = context.physicalFilename;
	const options = {
		allow: [],
		...context.options[0],
	};

	if (!/\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i.test(filename)) {
		return;
	}

	return {
		Program(node) {
			if (node.body.some(node => !isEmpty(node))) {
				return;
			}

			const {sourceCode} = context;
			const comments = sourceCode.getAllComments();
			const hasComments = comments.length > 0;

			if (hasTripeSlashDirectives(comments)) {
				return;
			}

			if (isAllowComments(options) && hasComments) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
			};
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allow: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
			recommended: true,
		},
		schema,
		messages,
	},
};
