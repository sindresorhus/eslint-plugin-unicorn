import stripIndent from 'strip-indent';
import indentString from 'indent-string';
import detectIndent from 'detect-indent';
import {replaceTemplateElement} from './fix/index.js';
import {isTaggedTemplateLiteral} from './ast/index.js';
import {isNodeMatches, getVisitorChildNodes} from './utils/index.js';
import isJestInlineSnapshot from './shared/is-jest-inline-snapshot.js';

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented.',
};

const getIgnoredTemplateLiteralLines = sourceCode => {
	const ignoredLines = new Set();
	const nodes = [sourceCode.ast];

	while (nodes.length > 0) {
		const node = nodes.pop();

		if (node.type === 'TemplateLiteral') {
			const {start: {line: startLine}, end: {line: endLine}} = sourceCode.getLoc(node);
			for (let line = startLine + 1; line <= endLine; line++) {
				ignoredLines.add(line);
			}
		}

		nodes.push(...getVisitorChildNodes(node, sourceCode.visitorKeys));
	}

	return ignoredLines;
};

const getTextForIndentDetection = (lines, ignoredLines = new Set()) => lines
	.map((line, index) => ignoredLines.has(index + 1) || line.trim() === '' ? '' : line)
	.join('\n');

const getTemplateIndent = template => {
	const text = getTextForIndentDetection(template.split(/\r?\n/));
	return detectIndent(stripIndent(text)).indent || detectIndent(text).indent;
};

const getDefaultIndent = (sourceCode, ignoredLines, parentMargin, template) => {
	if (parentMargin === '') {
		return detectIndent(getTextForIndentDetection(sourceCode.lines, ignoredLines)).indent || getTemplateIndent(template) || '  ';
	}

	return parentMargin.startsWith('\t') ? '\t' : '  ';
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const options = {...context.options[0]};
	const ignoredTemplateLiteralLines = getIgnoredTemplateLiteralLines(sourceCode);

	options.comments = options.comments.map(comment => comment.toLowerCase());
	const checked = new WeakSet();

	/**
	@param {import('@babel/core').types.TemplateLiteral} node
	*/
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
		if (!eolMatch || joined.slice(0, eolMatch.index).trim() !== '') {
			return;
		}

		const eol = eolMatch[0];

		const location = sourceCode.getLoc(node);
		const startLine = sourceCode.lines[location.start.line - 1];
		// The template starts on this line, so the leading whitespace is always followed by content.
		const [parentMargin] = startLine.match(/^\s*/);

		let indent;
		if (typeof options.indent === 'string') {
			indent = options.indent;
		} else if (typeof options.indent === 'number') {
			indent = ' '.repeat(options.indent);
		} else {
			indent = getDefaultIndent(sourceCode, ignoredTemplateLiteralLines, parentMargin, joined);
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

		return Boolean(options.functions.length > 0
			&& node.parent.type === 'CallExpression'
			&& node.parent.arguments.includes(node)
			&& isNodeMatches(node.parent.callee, options.functions));
	};

	context.on('TemplateLiteral', /** @param {import('@babel/core').types.TemplateLiteral} node */ node => {
		if (!shouldIndent(node)) {
			return;
		}

		return getProblem(node);
	});

	context.on(options.selectors, /** @param {import('@babel/core').types.TemplateLiteral} node */ node => getProblem(node));
};

/**
@type {import('json-schema').JSONSchema7[]}
*/
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
						description: 'Whitespace string to use as indentation.',
					},
					{
						type: 'integer',
						minimum: 1,
						description: 'Number of spaces to use as indentation.',
					},
				],
				description: 'The indentation to use inside the template literal.',
			},
			tags: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'Tagged template names to check.',
			},
			functions: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'Function names whose template literal arguments to check.',
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
					// An empty or blank selector does not reach ESLint's own selector check, it registers a listener on `undefined` and crashes the whole run
					minLength: 1,
					pattern: /\S/.source,
				},
				description: 'AST selectors for template literals to check.',
			},
			comments: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'Comment patterns to mark template literals for checking.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
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
		defaultOptions: [{
			tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
			functions: ['dedent', 'stripIndent'],
			selectors: [],
			comments: ['HTML', 'indent'],
		}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
