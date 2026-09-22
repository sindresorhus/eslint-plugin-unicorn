const MESSAGE_ID = 'no-javascript-url';
const messages = {
	[MESSAGE_ID]: 'Do not use `javascript:` URLs.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on(['definition', 'image', 'link'], node => {
		if (
			!URL.canParse(node.url)
			// eslint-disable-next-line no-script-url -- This rule checks for script URLs.
			|| new URL(node.url).protocol !== 'javascript:'
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
			description: 'Disallow `javascript:` URLs in Markdown.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
