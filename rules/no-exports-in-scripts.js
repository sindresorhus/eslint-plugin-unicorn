const MESSAGE_ID = 'no-exports-in-scripts';
const messages = {
	[MESSAGE_ID]: 'Do not use exports in scripts.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	if (!sourceCode.lines[0].startsWith('#!')) {
		return;
	}

	context.on(['ExportNamedDeclaration', 'ExportDefaultDeclaration', 'ExportAllDeclaration'], node => ({
		node,
		messageId: MESSAGE_ID,
	}));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow exports in scripts.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
	},
};

export default config;
