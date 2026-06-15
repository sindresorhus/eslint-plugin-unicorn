import {isEmptyNode, isDirective} from './ast/index.js';
import {getComments} from './utils/index.js';

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

	// Skip virtual files created by a processor (e.g. fenced code blocks in Markdown). An empty extracted block does not mean the physical file is empty.
	if (context.filename !== context.physicalFilename) {
		return;
	}

	context.on('Program', node => {
		// A Vue.js SFC parsed by `vue-eslint-parser` with a `<template>` is not an empty file even when `<script>` is empty.
		if (node.templateBody) {
			return;
		}

		// An HTML file parsed by `@html-eslint/parser` is represented as a single `Document` node holding the markup.
		if (node.body.length === 1 && node.body[0].type === 'Document') {
			const {children} = node.body[0];
			const hasContent = children.some(child =>
				child.type !== 'Comment'
				&& !(child.type === 'Text' && child.value.trim() === ''));

			if (hasContent) {
				return;
			}

			if (allowComments && children.some(child => child.type === 'Comment')) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
			};
		}

		if (node.body.some(node => !isEmpty(node))) {
			return;
		}

		const {sourceCode} = context;
		const comments = getComments(context);

		// A parser that does not understand the file (for example `eslint-parser-plain`, used for files like `.gitignore` or `.editorconfig`) produces an empty `Program` with no tokens or comments even when the file has content. Don't treat that as an empty file.
		if (
			sourceCode.ast.tokens.length === 0
			&& comments.length === 0
			&& sourceCode.text.trim() !== ''
		) {
			return;
		}

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

	// CSS file parsed by `@eslint/css`. Top-level rules and at-rules are in `children`; comments are on `sourceCode.comments`.
	context.on('StyleSheet', node => {
		if (node.children.length > 0) {
			return;
		}

		const comments = getComments(context);

		if (allowComments && comments.length > 0) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});

	// JSON file parsed by `@eslint/json`. The `body` is null when no value is present (comment-only jsonc/json5).
	// Skip the `Document` nested inside HTML's `Program` root — that is not a JSON document.
	context.on('Document', node => {
		if (node.parent?.type === 'Program') {
			return;
		}

		if (node.body !== null && node.body !== undefined) {
			return;
		}

		const comments = getComments(context);

		if (allowComments && comments.length > 0) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});

	// Markdown file parsed by `@eslint/markdown`. Top-level content is in `children`; HTML comments appear as `html` nodes.
	context.on('root', node => {
		const isHtmlComment = child =>
			child.type === 'html' && /^<!--(?:(?!-->)[\s\S])*-->$/.test(child.value.trim());

		if (node.children.some(child => !isHtmlComment(child))) {
			return;
		}

		if (allowComments && node.children.length > 0) {
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
		languages: [
			'js/js',
			'css/css',
			'html/html',
			'json/json',
			'json/jsonc',
			'json/json5',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
