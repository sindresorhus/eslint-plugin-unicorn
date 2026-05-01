import {replaceTemplateElement} from './fix/index.js';
import {isStringLiteral, isRegexLiteral, isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-hex-escape';
const messages = {
	[MESSAGE_ID]: 'Use Unicode escapes instead of hexadecimal escapes.',
};

function checkEscape(context, node, value) {
	const fixedValue = value.replaceAll(/(?<=(?:^|[^\\])(?:\\\\)*\\)x/g, 'u00');

	if (value !== fixedValue) {
		return {
			node,
			messageId: MESSAGE_ID,
			fix: fixer =>
				node.type === 'TemplateElement'
					? replaceTemplateElement(node, fixedValue, context, fixer)
					: fixer.replaceText(node, fixedValue),
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (isStringLiteral(node) || isRegexLiteral(node)) {
			return checkEscape(context, node, node.raw);
		}
	});

	context.on('TemplateElement', node => {
		// Skip all tagged template literals: changing escape sequences in a tagged
		// template modifies the `raw` property received by the tag function,
		// which can silently break runtime behaviour (see #2341).
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return checkEscape(context, node, node.value.raw);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of Unicode escapes instead of hexadecimal escapes.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
