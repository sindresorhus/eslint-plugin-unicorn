'use strict';
const stripIndent = require('strip-indent');
const indentString = require('indent-string');
const esquery = require('esquery');
const {replaceTemplateElement} = require('./fix/index.js');

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();
	const options = {
		tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
		functions: ['dedent', 'stripIndent'],
		selectors: [],
		comments: ['HTML', 'indent'],
		...context.options[0],
	};

	options.comments = options.comments.map(comment => comment.toLowerCase());

	const selectors = [
		...options.tags.map(tag => `TaggedTemplateExpression[tag.name="${tag}"] > .quasi`),
		...options.functions.map(fn => `CallExpression[callee.name="${fn}"] > .arguments`),
		...options.selectors,
	];

	/** @param {import('@babel/core').types.TemplateLiteral} node */
	const indentTemplateLiteralNode = node => {
		const delimiter = '__PLACEHOLDER__' + Math.random();
		const joined = node.quasis
			.map(quasi => {
				const untrimmedText = sourceCode.getText(quasi);
				return untrimmedText.slice(1, quasi.tail ? -1 : -2);
			})
			.join(delimiter);

		const eolMatch = joined.match(/\r?\n/);
		if (!eolMatch) {
			return;
		}

		const eol = eolMatch[0];

		const startLine = sourceCode.lines[node.loc.start.line - 1];
		const marginMatch = startLine.match(/^(\s*)\S/);
		const parentMargin = marginMatch ? marginMatch[1] : '';

		let indent;
		if (typeof options.indent === 'string') {
			indent = options.indent;
		} else if (typeof options.indent === 'number') {
			indent = ' '.repeat(options.indent);
		} else {
			const tabs = parentMargin.startsWith('\t');
			indent = tabs ? '\t' : '  ';
		}

		const dedented = stripIndent(joined);
		const fixed
			= eol
			+ indentString(dedented.trim(), 1, {indent: parentMargin + indent})
			+ eol
			+ parentMargin;

		if (fixed === joined) {
			return;
		}

		context.report({
			node,
			messageId: MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE,
			fix: fixer => fixed
				.split(delimiter)
				.map((replacement, index) => replaceTemplateElement(fixer, node.quasis[index], replacement)),
		});
	};

	return {
		/** @param {import('@babel/core').types.TemplateLiteral} node */
		TemplateLiteral: node => {
			if (options.comments.length > 0) {
				const previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
				if (previousToken && previousToken.type === 'Block' && options.comments.includes(previousToken.value.trim().toLowerCase())) {
					indentTemplateLiteralNode(node);
					return;
				}
			}

			const ancestry = context.getAncestors().reverse();
			const shouldIndent = selectors.some(selector => esquery.matches(node, esquery.parse(selector), ancestry));

			if (shouldIndent) {
				indentTemplateLiteralNode(node);
			}
		},
	};
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			indent: {
				oneOf: [
					{
						type: 'string',
						pattern: /^\s+$/.source,
					},
					{
						type: 'integer',
						minimum: 1,
					},
				],
			},
			tags: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			functions: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			comments: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
		},
	},
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Fix whitespace-insensitive template indentation.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
