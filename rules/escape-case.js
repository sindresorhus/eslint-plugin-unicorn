'use strict';

const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

const escapeWithLowercase = /(?<before>(?:^|[^\\])(?:\\\\)*)\\(?<data>x[\da-f]{2}|u[\da-f]{4}|u{[\da-f]+})/;
const escapePatternWithLowercase = /(?<before>(?:^|[^\\])(?:\\\\)*)\\(?<data>x[\da-f]{2}|u[\da-f]{4}|u{[\da-f]+}|c[a-z])/;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = (value, regexp) => {
	const results = regexp.exec(value);

	if (results) {
		const {before, data} = results.groups;
		const prefix = before.length + 1;
		const fixedEscape = data.slice(0, 1) + data.slice(1).toUpperCase();
		return (
			value.slice(0, results.index + prefix) +
			fixedEscape +
			value.slice(results.index + results[0].length)
		);
	}

	return value;
};


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
