const MESSAGE_ID = 'no-unscoped-css-nesting-selector';
const messages = {
	[MESSAGE_ID]: 'Do not use a CSS nesting selector without a scoping root.',
};

const isScopeAtRule = node => node.type === 'Atrule' && node.name.toLowerCase() === 'scope';

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
			|| (currentNode.type === 'Atrule' && scopingRootAtRules.has(currentNode.name.toLowerCase()))
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
		context.options[0].scopingRootAtRules.map(name => name.toLowerCase()),
	);
	const {sourceCode} = context;

	context.on('NestingSelector', node => {
		const selectorOwner = getSelectorOwner(node, sourceCode);
		if (
			!selectorOwner
			|| (selectorOwner.type !== 'Rule' && !isScopeAtRule(selectorOwner))
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
