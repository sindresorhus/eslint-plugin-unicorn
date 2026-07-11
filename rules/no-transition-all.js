const MESSAGE_ID = 'no-transition-all';
const messages = {
	[MESSAGE_ID]: 'Do not use `all` as a transition property.',
};

const transitionProperties = new Set([
	'transition',
	'transition-property',
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Declaration', declaration => {
		if (
			!transitionProperties.has(declaration.property.toLowerCase())
			|| declaration.value.type !== 'Value'
		) {
			return;
		}

		return declaration.value.children
			.filter(node => node.type === 'Identifier' && node.name.toLowerCase() === 'all')
			.map(node => ({
				node,
				messageId: MESSAGE_ID,
			}));
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `all` as a transition property.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
			'css/css',
		],
	},
};

export default config;
