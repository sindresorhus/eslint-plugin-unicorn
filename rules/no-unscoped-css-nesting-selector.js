import {ident} from '@eslint/css-tree';

const MESSAGE_ID = 'no-unscoped-css-nesting-selector';
const messages = {
	[MESSAGE_ID]: 'Do not use a CSS nesting selector without an ancestor scoping root.',
};

const normalizeAtRuleName = name => ident.decode(name).toLowerCase();

const isScopeAtRule = node => node.type === 'Atrule' && normalizeAtRuleName(node.name) === 'scope';

const isKeyframeRule = (node, sourceCode) => {
	const block = sourceCode.getParent(node);
	const atRule = sourceCode.getParent(block);
	return atRule?.type === 'Atrule' && /^(?:-(?:moz|ms|o|webkit)-)?keyframes$/.test(normalizeAtRuleName(atRule.name));
};

const getSelectorOwner = (node, sourceCode) => {
	let currentNode = node;

	while (currentNode) {
		if (currentNode.type === 'Rule' || currentNode.type === 'Atrule') {
			return currentNode;
		}

		currentNode = sourceCode.getParent(currentNode);
	}
};

const hasScopingRoot = (selectorOwner, sourceCode, scopingRootAtRules) => {
	let currentNode = sourceCode.getParent(selectorOwner);

	while (currentNode) {
		if (
			currentNode.type === 'Rule'
			|| isScopeAtRule(currentNode)
			|| (currentNode.type === 'Atrule' && scopingRootAtRules.has(normalizeAtRuleName(currentNode.name)))
		) {
			return true;
		}

		currentNode = sourceCode.getParent(currentNode);
	}

	return false;
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			scopingRootAtRules: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
					minLength: 1,
					pattern: '^[^@]+$',
				},
				description: 'At-rules that provide a scoping root.',
			},
		},
	},
];

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const scopingRootAtRules = new Set(
		context.options[0].scopingRootAtRules.map(name => normalizeAtRuleName(name)),
	);
	const {sourceCode} = context;

	context.on('NestingSelector', node => {
		const selectorOwner = getSelectorOwner(node, sourceCode);
		if (
			!selectorOwner
			|| (selectorOwner.type !== 'Rule' && !isScopeAtRule(selectorOwner))
			|| (selectorOwner.type === 'Rule' && isKeyframeRule(selectorOwner, sourceCode))
			|| hasScopingRoot(selectorOwner, sourceCode, scopingRootAtRules)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unscoped CSS nesting selectors.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{scopingRootAtRules: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
