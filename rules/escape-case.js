'use strict';
const escapeWithLowercase = /\\(x[a-f\d]{2}|u[a-f\d]{4}|u\{([a-f\d]{1,})\}|c[a-z])/;
const hasLowercaseCharacter = /[a-z]+/;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = value => {
	const results = escapeWithLowercase.exec(value);

	if (results) {
		const fixedEscape = results[0].slice(0, 2) + results[0].slice(2).toUpperCase();
		return value.slice(0, results.index) + fixedEscape + value.slice(results.index + results[0].length);
	}

	return value;
};

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			const matches = node.raw.match(escapeWithLowercase);

			if (matches && matches[0].slice(2).match(hasLowercaseCharacter)) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange([node.start, node.end], fix(node.raw))
				});
			}
		},
		TemplateElement(node) {
			if (typeof node.value.raw !== 'string') {
				return;
			}

			const matches = node.value.raw.match(escapeWithLowercase);

			if (matches && matches[0].slice(2).match(hasLowercaseCharacter)) {
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
