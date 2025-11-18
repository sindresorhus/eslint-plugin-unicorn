import stripIndent from 'strip-indent';
import indentString from 'indent-string';
import {replaceTemplateElement} from './fix/index.js';
import {isTaggedTemplateLiteral} from './ast/index.js';
import {isNodeMatches} from './utils/index.js';
import isJestInlineSnapshot from './shared/is-jest-inline-snapshot.js';

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const options = {
		tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
		functions: ['dedent', 'stripIndent'],
		selectors: [],
		comments: ['HTML', 'indent'],
		...context.options[0],
	};

	options.comments = options.comments.map(comment => comment.toLowerCase());
	const checked = new WeakSet();

	/** @param {import('@babel/core').types.TemplateLiteral} node */
	const getProblem = node => {
		if (node.type !== 'TemplateLiteral' || checked.has(node)) {
			return;
		}

		checked.add(node);

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

		const startLine = sourceCode.lines[sourceCode.getLoc(node).start.line - 1];
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
		const trimmed = dedented.replaceAll(new RegExp(`^${eol}|${eol}[ \t]*$`, 'g'), '');

		const fixed
			= eol
				+ indentString(trimmed, 1, {indent: parentMargin + indent})
				+ eol
				+ parentMargin;

		if (fixed === joined) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE,
			fix: fixer => fixed
				.split(delimiter)
				.map((replacement, index) => replaceTemplateElement(node.quasis[index], replacement, context, fixer)),
		};
	};

	const shouldIndent = node => {
		if (options.comments.length > 0) {
			const previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
			if (previousToken?.type === 'Block' && options.comments.includes(previousToken.value.trim().toLowerCase())) {
				return true;
			}
		}

		if (isJestInlineSnapshot(node)) {
			return true;
		}

		if (
			options.tags.length > 0
			&& isTaggedTemplateLiteral(node, options.tags)
		) {
			return true;
		}

		if (
			options.functions.length > 0
			&& node.parent.type === 'CallExpression'
			&& node.parent.arguments.includes(node)
			&& isNodeMatches(node.parent.callee, options.functions)
		) {
			return true;
		}

		return false;
	};

	context.on('TemplateLiteral', /** @param {import('@babel/core').types.TemplateLiteral} node */ node => {
		if (!shouldIndent(node)) {
			return;
		}

		return getProblem(node);
	});

	context.on(options.selectors, /** @param {import('@babel/core').types.TemplateLiteral} node */ node => getProblem(node));
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

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Fix whitespace-insensitive template indentation.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
