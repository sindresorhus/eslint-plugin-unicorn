'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

const escapeWithLowercase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+})/g;
const escapePatternWithLowercase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+}|c[a-z])/g;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = (value, regexp) => 
  value.replace(regexp, data => data.slice(0, 1) + data.slice(1).toUpperCase());

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			const original = node.raw;
			const fixed = fix(original, escapeWithLowercase);

			if (fixed !== original) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, fixed)
				});
			}
		},
		'Literal[regex]'(node) {
			const original = node.raw;
			const fixed = fix(original, escapePatternWithLowercase);

			if (fixed !== original) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, fixed)
				});
			}
		},
		TemplateElement(node) {
			const original = node.value.raw;
			const fixed = fix(original, escapePatternWithLowercase);

			if (fixed !== original) {
				context.report({
					node,
					message,
					fix: fixer => replaceTemplateElement(fixer, node, fixed)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
