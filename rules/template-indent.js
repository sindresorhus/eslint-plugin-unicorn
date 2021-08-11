'use strict';
const stripIndent = require('strip-indent');

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const MESSAGE_ID_INVALID_NODE_TYPE = 'invalid-node-type';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented. Selector: {{ selector }}',
	[MESSAGE_ID_INVALID_NODE_TYPE]: 'Invalid node type matched by selector {{ selector }}. Expected TemplateLiteral, got {{ type }}',
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

	/** @param {string} selector */
	const getTemplateLiteralHandler = selector =>
		/** @param {import('@babel/core').types.TemplateLiteral} node */
		node => {
			if (node.type !== 'TemplateLiteral') {
				return;
			}

			const delimiter = '__PLACEHOLDER__' + Math.random();
			const joined = node.quasis.map(q => q.value.raw).join(delimiter);

			if (!joined.includes('\n')) {
				return;
			}

			const dedented = stripIndent(joined).trim();

			const startLine = context.getSourceCode().lines[node.loc.start.line - 1];
			const marginMatch = startLine.match(/^(\s*)\S/);
			const parentMargin = marginMatch ? marginMatch[1] : '';
			const tabs = parentMargin.startsWith('\t');
			const indent = tabs ? '\t' : '  ';
			const templateMargin = parentMargin + indent;

			const fixed = '\n'
				+ dedented
					.split('\n')
					.map(line => line && line !== '\r' ? templateMargin + line : line)
					.join('\n')
					.trimEnd()
				+ '\n'
				+ parentMargin;

			if (fixed === joined) {
				return;
			}

			const replacements = fixed.split(delimiter).map((section, index, {length}) => {
				const range = [...node.quasis[index].range];

				// Add one either for the "`" or "}" prefix character
				range[0] += 1;

				// Subtract one at the end for the "`" or two in the middle for the "${"
				const last = index === length - 1;
				range[1] -= last ? 1 : 2;

				return {
					range,
					value: section,
				};
			});
			context.report({
				node,
				messageId: MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE,
				data: {
					selector,
				},
				fix: fixer => replacements.reverse().map(r => fixer.replaceTextRange(r.range, r.value)),
			});
		};

	return {
		...Object.fromEntries(selectors.map(selector => [selector, getTemplateLiteralHandler(selector)])),
		/**
		 * @param {import('@babel/core').types.TemplateLiteral} node
		 */
		TemplateLiteral: node => {
			const previous = context.getSourceCode().getTokenBefore(node, {includeComments: true});
			if (previous.type === 'Block' && options.comments.includes(previous.value.trim().toLowerCase())) {
				const handler = getTemplateLiteralHandler(`/*${previous.value}*/ TemplateLiteral`);
				handler(node);
			}
		},
	};
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		properties: {
			tags: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			functions: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			selectors: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			comments: {
				type: 'array',
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