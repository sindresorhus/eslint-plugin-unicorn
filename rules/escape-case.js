'use strict';
const escapeWithLowercase = /((^|[^\\])(\\\\)*)\\(x[a-f0-9]{2}|u[a-f0-9]{4}|u\{([0-9a-f]{1,})\}|c[a-z])/;
const hasLowercaseCharacter = /[a-z].*?[a-z]/;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = value => {
	const results = escapeWithLowercase.exec(value);

	if (results) {
		const prefix = results[1].length + 1;
		const fixedEscape = results[4].slice(0, 1) + results[4].slice(1).toUpperCase();
		return value.slice(0, results.index + prefix) + fixedEscape + value.slice(results.index + results[0].length);
	}

	return value;
};

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value === 'string' && node.raw.match(escapeWithLowercase) && node.raw.match(hasLowercaseCharacter)) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange([node.start, node.end], fix(node.raw))
				});
			}
		},
		TemplateElement(node) {
			if (typeof node.value.raw === 'string' && node.value.raw.match(escapeWithLowercase) && node.value.raw.match(hasLowercaseCharacter)) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange([node.start, node.end], fix(node.value.raw))
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
