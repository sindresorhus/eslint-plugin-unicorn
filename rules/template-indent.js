'use strict';
const stripIndent = require('strip-indent');

const MESSAGE_ID = 'template-indent';
const messages = {
	[MESSAGE_ID]: 'Templates should be properly indented.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = {
		tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
		functions: ['dedent', 'stripIndent'],
		...context.options[0],
	};
	return {
		/** @param {import('@babel/core').types.TemplateLiteral} node */
		TemplateLiteral(node) {
			const parentTag = node.parent.type === 'TaggedTemplateExpression' && node.parent.tag.type === 'Identifier'
				? node.parent.tag.name
				// eslint-disable-next-line unicorn/no-null
				: null;
			const parentFunction = node.parent.type === 'CallExpression' && node.parent.callee.type === 'Identifier'
				? node.parent.callee.name
				// eslint-disable-next-line unicorn/no-null
				: null;

			const fixable = options.tags.includes(parentTag) || options.functions.includes(parentFunction);
			if (!fixable) {
				return;
			}

			const delimiter = '__PLACEHOLDER__' + Math.random();
			const joined = node.quasis.map(q => q.value.raw).join(delimiter);

			const dedented = stripIndent(joined).trim();

			const source = context.getSourceCode().getText();

			const preamble = source.slice(0, node.range[0]).split('\n');
			const line = preamble.length;

			const marginMatch = preamble[line - 1].match(/^(\s*)\S/);
			const parentMargin = marginMatch ? marginMatch[1] : '';
			const tabs = parentMargin.startsWith('\t');
			const indent = tabs ? '\t' : '  ';
			const templateMargin = parentMargin + indent;

			const fixed = '\n' + dedented.split('\n').map(line => templateMargin + line).join('\n').trimEnd() + '\n' + parentMargin;

			if (fixed === joined) {
				return;
			}

			const replacements = fixed.split(delimiter).map((section, i, {length}) => {
				const range = [...node.quasis[i].range];

				// Add one either for the "`" or "}" prefix character
				range[0] += 1;

				// Subtract one at the end for the "`" or two in the middle for the "${"
				const last = i === length - 1;
				range[1] -= last ? 1 : 2;

				return {
					range,
					value: section,
				};
			});
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => replacements.reverse().map(r => fixer.replaceTextRange(r.range, r.value)),
			});
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
					oneOf: [{type: 'string'}, {type: 'null'}],
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
