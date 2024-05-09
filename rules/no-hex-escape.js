'use strict';
const {replaceTemplateElement} = require('./fix/index.js');
const {
	isStringLiteral,
	isRegexLiteral,
	isTaggedTemplateLiteral,
} = require('./ast/index.js');

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
					? replaceTemplateElement(fixer, node, fixedValue)
					: fixer.replaceText(node, fixedValue),
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Literal(node) {
		if (isStringLiteral(node) || isRegexLiteral(node)) {
			return checkEscape(context, node, node.raw);
		}
	},
	TemplateElement(node) {
		if (isTaggedTemplateLiteral(node.parent, ['String.raw'])) {
			return;
		}

		return checkEscape(context, node, node.value.raw);
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of Unicode escapes instead of hexadecimal escapes.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
