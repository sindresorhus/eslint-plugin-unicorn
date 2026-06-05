import {isEmptyNode, isDirective} from './ast/index.js';

const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowComments: {
				type: 'boolean',
				description: 'Whether to allow files that only contain comments.',
			},
		},
	},
];

const isEmpty = node => isEmptyNode(node, isDirective);

const isRegularComment = node =>
	node.type === 'Line'
	|| node.type === 'Block';

const isTripleSlashDirective = node =>
	node.type === 'Line' && node.value.startsWith('/');

const hasTripleSlashDirectives = comments =>
	comments.some(currentNode => isTripleSlashDirective(currentNode));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {allowComments} = context.options[0];
	const filename = context.physicalFilename;

	if (!/\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i.test(filename)) {
		return;
	}

	context.on('Program', node => {
		if (node.body.some(node => !isEmpty(node))) {
			return;
		}

		const {sourceCode} = context;
		const comments = sourceCode.getAllComments();

		if (hasTripleSlashDirectives(comments)) {
			return;
		}

		if (
			allowComments
			&& comments.length > 0
			&& comments.every(comment => isRegularComment(comment))
			&& sourceCode.ast.tokens.length === 0
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{allowComments: false}],
		messages,
	},
};

export default config;
