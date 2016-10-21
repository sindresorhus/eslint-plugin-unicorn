'use strict';
const hexRE = /\\x[a-fA-F0-9]{2}/;

const fix = value => hexRE.test(value) ? value.replace(/\\x/g, '\\u00') : value;

const create = context => {
	return {
		Literal: node => {
			const value = node.raw;
			const fixedValue = fix(value);

			if (value !== fixedValue) {
				context.report({
					node,
					message: 'Use unicode escape codes instead of hexadecimal escapes.',
					fix: fixer => fixer.replaceText(node, fixedValue)
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
