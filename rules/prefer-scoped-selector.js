import {isMethodCall, isStringLiteral} from './ast/index.js';
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

const getStaticSelector = node => {
	if (isStringLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	) {
		return node.quasis[0].value.cooked;
	}
};

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

const isScopedSelector = selector => selector.includes(':scope');

const isSelectorList = selector => selector.includes(',');

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
		const selector = getStaticSelector(selectorNode);
		if (
			selector === undefined
			|| selector.trim() === ''
			|| isScopedSelector(selector)
		) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: MESSAGE_ID_ERROR,
		};

		if (!isSelectorList(selector)) {
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
