import {ident} from '@eslint/css-tree';

const MESSAGE_ID = 'no-unscoped-css-nesting-selector';
const messages = {
	[MESSAGE_ID]: 'Do not use a CSS nesting selector without an ancestor scoping root.',
};

const normalizeAtRuleName = name => ident.decode(name).replaceAll(/[A-Z]/g, character => character.toLowerCase());

const isScopeAtRule = node => node.type === 'Atrule' && normalizeAtRuleName(node.name) === 'scope';
const isKeyframesAtRule = node => node?.type === 'Atrule' && /^(?:-(?:moz|o|webkit)-)?keyframes$/.test(normalizeAtRuleName(node.name));

const isStyleRule = (node, sourceCode) => {
	if (node.type !== 'Rule') {
		return false;
	}

	const block = sourceCode.getParent(node);
	const atRule = sourceCode.getParent(block);
	return !isKeyframesAtRule(atRule);
};

const isInScopeLimit = (node, sourceCode, selectorList) => {
	switch (node?.type) {
		case 'SelectorList': {
			return isInScopeLimit(sourceCode.getParent(node), sourceCode, node);
		}

		case 'Scope': {
			return node.limit === selectorList;
		}

		case 'Atrule':
		case undefined: {
			return false;
		}

		default: {
			return isInScopeLimit(sourceCode.getParent(node), sourceCode, selectorList);
		}
	}
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
		if (isKeyframesAtRule(currentNode)) {
			return false;
		}

		if (
			isStyleRule(currentNode, sourceCode)
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
			|| (!isStyleRule(selectorOwner, sourceCode) && !isScopeAtRule(selectorOwner))
			|| isInScopeLimit(node, sourceCode)
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
