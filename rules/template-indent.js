'use strict';
const os = require('os');
const stripIndent = require('strip-indent');
const indentString = require('indent-string');
const {replaceTemplateElement} = require('./fix/index.js');
const {matches} = require('./selectors/index.js');

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
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
		...options.functions.map(fn => `CallExpression[callee.name="${fn}"] > .arguments:first-child`),
		...options.selectors,
	];

	const handled = new Set()

	/** @param {import('@babel/core').types.TemplateLiteral} node */
	const templateLiteralHandler = node => {
		if (handled.has(node)) {
			return
		}
		handled.add(node)

		if (node.type !== 'TemplateLiteral') {
			return;
		}

		const delimiter = '__PLACEHOLDER__' + Math.random();
		const joined = node.quasis.map(q => q.value.raw).join(delimiter);

		if (!joined.includes('\n')) {
			return;
		}

		const startLine = context.getSourceCode().lines[node.loc.start.line - 1];
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
			= os.EOL
			+ indentString(dedented.trim(), 1, {indent: parentMargin + indent})
			+ os.EOL
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

	const matchers = {
		[matches(selectors)]: templateLiteralHandler,
	};

	if (options.comments.length > 0 && !selectors.includes('TemplateLiteral')) {
		/** @param {import('@babel/core').types.TemplateLiteral} node */
		matchers.TemplateLiteral = node => {
			const previousToken = context.getSourceCode().getTokenBefore(node, {includeComments: true});
			if (previousToken && previousToken.type === 'Block' && options.comments.includes(previousToken.value.trim().toLowerCase())) {
				templateLiteralHandler(node);
			}
		};
	}

	return matchers;
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		properties: {
			indent: {
				oneOf: [
					{
						type: 'string',
						pattern: '^\\s+$',
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
		additionalProperties: false,
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
