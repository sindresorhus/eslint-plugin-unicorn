import {ident, tokenize, tokenTypes} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-self-referencing-custom-properties';
const messages = {
	[MESSAGE_ID]: 'Custom property `{{property}}` must not reference itself.',
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		const property = ident.decode(declaration.property);
		if (
			!property.startsWith('--')
			|| sourceCode.getParent(declaration)?.type !== 'Block'
		) {
			return;
		}

		const text = sourceCode.getText(declaration.value);
		const [offset] = sourceCode.getRange(declaration.value);
		const tokens = [];
		// Custom-property values and var() fallbacks can be opaque Raw nodes.
		tokenize(text, (type, start, end) => {
			if (type !== tokenTypes.WhiteSpace && type !== tokenTypes.Comment) {
				tokens.push({type, start, end});
			}
		});

		for (const [index, token] of tokens.entries()) {
			const reference = tokens[index + 1];
			const boundary = tokens[index + 2];
			if (
				token.type !== tokenTypes.Function
				|| reference?.type !== tokenTypes.Ident
				|| (boundary?.type !== tokenTypes.Comma && boundary?.type !== tokenTypes.RightParenthesis)
				|| ident.decode(text.slice(token.start, token.end - 1)).toLowerCase() !== 'var'
				|| ident.decode(text.slice(reference.start, reference.end)) !== property
			) {
				continue;
			}

			return {
				node: declaration,
				loc: toLocation([offset + reference.start, offset + reference.end], context),
				messageId: MESSAGE_ID,
				data: {property},
			};
		}
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
			description: 'Disallow self-references in CSS custom properties.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
