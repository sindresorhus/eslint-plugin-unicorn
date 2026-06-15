import {getStaticStringValue, isMethodCall} from './ast/index.js';
import {isNodeValueNotDomNode} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-scoped-selector/error';
const MESSAGE_ID_SUGGESTION = 'prefer-scoped-selector/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Use `:scope` in element selector queries.',
	[MESSAGE_ID_SUGGESTION]: 'Prefix the selector with `:scope`.',
};

const selectorMethods = [
	'querySelector',
	'querySelectorAll',
];

const isDocumentQuery = node =>
	node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'document';

const isGlobalDocumentQuery = node =>
	node.callee.object.type === 'MemberExpression'
	&& !node.callee.object.computed
	&& node.callee.object.object.type === 'Identifier'
	&& ['globalThis', 'window'].includes(node.callee.object.object.name)
	&& node.callee.object.property.type === 'Identifier'
	&& node.callee.object.property.name === 'document';

// Matches the `:scope` pseudo-class as a whole token (not `::scope`, `:scoped`, etc.).
const scopePattern = /(?<!:):scope(?![\w-])/i;

/*
Split a selector into its top-level comma-separated branches, following the CSS tokenizer: strings, comments, and backslash escapes are stripped so their contents can't be mistaken for structure, and commas nested in `()`/`[]`/`{}` blocks are not separators. The returned branches keep only the structural text, which is enough to count branches and to detect a real `:scope` token.
https://www.w3.org/TR/css-syntax-3/#tokenization
*/
const splitSelectorList = selector => {
	const branches = [];
	let depth = 0;
	let quote;
	let current = '';
	for (let index = 0; index < selector.length; index++) {
		const character = selector[index];

		// Inside a string, skip everything (including escapes) until the matching quote.
		if (quote) {
			if (character === '\\') {
				index++;
			} else if (character === quote) {
				quote = undefined;
			}

			continue;
		}

		// Comment.
		if (character === '/' && selector[index + 1] === '*') {
			const end = selector.indexOf('*/', index + 2);
			index = end === -1 ? selector.length : end + 1;
			continue;
		}

		// String start.
		if (character === '"' || character === '\'') {
			quote = character;
			continue;
		}

		// Escape outside a string consumes the next code point.
		if (character === '\\') {
			index++;
			current += ' ';
			continue;
		}

		if ('([{'.includes(character)) {
			depth++;
		} else if (')]}'.includes(character)) {
			depth--;
		} else if (character === ',' && depth === 0) {
			branches.push(current);
			current = '';
			continue;
		}

		current += character;
	}

	branches.push(current);
	return branches;
};

const getPrefixScopeFix = (node, sourceCode) => fixer => {
	const [start] = sourceCode.getRange(node);
	return fixer.insertTextAfterRange([start, start + 1], ':scope ');
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods: selectorMethods,
				argumentsLength: 1,
			})
			|| isDocumentQuery(node)
			|| isGlobalDocumentQuery(node)
			|| isNodeValueNotDomNode(node.callee.object)
		) {
			return;
		}

		const [selectorNode] = node.arguments;
		const selector = getStaticStringValue(selectorNode);
		if (
			selector === undefined
			|| selector.trim() === ''
		) {
			return;
		}

		// Accept the selector only when every branch of the list is scoped.
		const branches = splitSelectorList(selector);
		if (branches.every(branch => scopePattern.test(branch))) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: MESSAGE_ID_ERROR,
		};

		if (branches.length === 1) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: getPrefixScopeFix(selectorNode, sourceCode),
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `:scope` when using element query selector methods.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
