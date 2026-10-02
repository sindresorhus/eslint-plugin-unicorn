/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-empty-link-text';
const messages = {
	[MESSAGE_ID]: 'Link text must not be empty.',
};

function isEmptyLinkContent(node) {
	switch (node.type) {
		case 'footnoteReference':
		case 'html': {
			// Footnote references render a marker, and embedded HTML may provide an accessible name that cannot be determined here.
			return false;
		}

		case 'text':
		case 'inlineMath':
		case 'inlineCode': {
			return node.value.trim().length === 0;
		}

		case 'image':
		case 'imageReference': {
			return !node.alt?.trim();
		}

		default: {
			return node.children?.every(child => isEmptyLinkContent(child)) ?? true;
		}
	}
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on(['link', 'linkReference'], node => {
		if (!isEmptyLinkContent(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow empty link text in Markdown.',
			recommended: 'unopinionated',
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
