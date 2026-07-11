const MESSAGE_ID = 'no-transition-all';
const messages = {
	[MESSAGE_ID]: 'Do not use `all` as a transition property.',
};

const transitionProperties = new Set([
	'transition',
	'transition-property',
]);

const CSS_ESCAPE = /\\(?:(?<codePoint>[\da-f]{1,6})\s?|(?<character>.))/giu;

const decodeCssEscape = (_, codePoint, character) => {
	if (!codePoint) {
		return character;
	}

	const value = Number.parseInt(codePoint, 16);

	return value === 0 || value > 0x10FFFF
		? '\uFFFD'
		: String.fromCodePoint(value);
};

const normalizeCssIdentifier = identifier => identifier
	.replace(CSS_ESCAPE, decodeCssEscape)
	.toLowerCase();

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Declaration', declaration => {
		if (
			!transitionProperties.has(normalizeCssIdentifier(declaration.property))
			|| declaration.value.type !== 'Value'
			|| context.sourceCode.getParent(declaration)?.type === 'SupportsDeclaration'
		) {
			return;
		}

		return declaration.value.children
			.filter(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'all')
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
