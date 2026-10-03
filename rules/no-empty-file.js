import {isEmptyNode, isDirective} from './ast/index.js';
import {getComments, isEslintDisableOrEnableDirective} from './utils/index.js';

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

const isEmpty = node =>
	isEmptyNode(node, isDirective)
	|| (node.type === 'TOMLTopLevelTable' && node.body.length === 0);

const isRegularComment = node =>
	node.type === 'Line'
	|| node.type === 'Block';

const isTripleSlashDirective = node =>
	node.type === 'Line' && node.value.startsWith('/');

const hasTripleSlashDirectives = comments =>
	comments.some(currentNode => isTripleSlashDirective(currentNode));

const hasAllowedComments = (context, comments = getComments(context)) =>
	comments.some(comment => !isEslintDisableOrEnableDirective(context, comment));

// Report at ESLint's first directive so disables apply consistently across languages, including after leading whitespace.
const getProblem = (context, node) => ({
	node: context.sourceCode.getDisableDirectives().directives[0]?.node ?? node,
	messageId: MESSAGE_ID,
});

const hasYamlContent = document => {
	const {content} = document;
	return content !== null && (content.type !== 'YAMLWithMeta' || content.value !== null);
};

const getYamlProblem = (context, node, allowComments) => {
	if (node.body.some(document => hasYamlContent(document))) {
		return;
	}

	if (allowComments && hasAllowedComments(context) && node.tokens.length === 0) {
		return;
	}

	return getProblem(context, node);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {allowComments} = context.options[0];

	// Skip virtual files created by a processor (e.g. fenced code blocks in Markdown). An empty extracted block does not mean the physical file is empty.
	if (context.filename !== context.physicalFilename) {
		return;
	}

	const isYaml = context.sourceCode.parserServices?.isYAML;
	context.on('Program', node => {
		if (isYaml) {
			return getYamlProblem(context, node, allowComments);
		}

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

			if (allowComments && hasAllowedComments(context)) {
				return;
			}

			return getProblem(context, node);
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
			&& hasAllowedComments(context)
			&& comments.every(comment => isRegularComment(comment))
			&& sourceCode.ast.tokens.length === 0
		) {
			return;
		}

		return getProblem(context, node);
	});

	// CSS file parsed by `@eslint/css`. Top-level rules and at-rules are in `children`; comments are on `sourceCode.comments`.
	context.on('StyleSheet', node => {
		if (node.children.length > 0) {
			return;
		}

		if (allowComments && hasAllowedComments(context)) {
			return;
		}

		return getProblem(context, node);
	});

	// JSON file parsed by `@eslint/json`. Empty or comment-only files normally fail parsing before rules run.
	// Skip the `Document` nested inside HTML's `Program` root — that is not a JSON document.
	context.on('Document', node => {
		if (node.parent?.type === 'Program') {
			return;
		}

		// `@eslint/json` currently fails to parse empty and comment-only documents, so this is kept for parsers that allow them.
		/* node:coverage ignore next 10 */
		if (node.body !== null && node.body !== undefined) {
			return;
		}

		if (allowComments && hasAllowedComments(context)) {
			return;
		}

		return getProblem(context, node);
	});

	// Markdown file parsed by `@eslint/markdown`. Top-level content is in `children`; adjacent HTML comments may share an `html` node.
	context.on('root', node => {
		const comments = [];
		for (const child of node.children) {
			if (child.type !== 'html') {
				return;
			}

			const commentParts = child.value.split('-->');
			if (commentParts.pop().trim() !== '') {
				return;
			}

			let [offset] = context.sourceCode.getRange(child);
			for (const part of commentParts) {
				const trimmedPart = part.trimStart();
				if (!trimmedPart.startsWith('<!--')) {
					return;
				}

				const end = offset + part.length + 3;
				comments.push({range: [offset + part.length - trimmedPart.length, end]});
				offset = end;
			}
		}

		if (allowComments && hasAllowedComments(context, comments)) {
			return;
		}

		return getProblem(context, node);
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
			'toml/toml',
			'yml/yaml',
		],
	},
};

export default config;
