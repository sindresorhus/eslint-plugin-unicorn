'use strict';
const hexRE = /\\x[a-fA-F0-9]{2}/;

const fix = value => {
	if (!hexRE.test(value)) {
		return value;
	}

	return value.replace(/\\x/g, '\\u00');
};

const create = context => {
	return {
		Literal: node => {
			const value = node.raw;
			const fixedValue = fix(value);

			if (value !== fixedValue) {
				context.report({
					node,
					message: 'Use unicode escapes over hexadecimal escapes',
					fix: fixer => fixer.replaceText(node, fixedValue)
				});
			}
		}
	};
};

module.exports = {
	meta: {
		fixable: 'code'
	},
	create
};
