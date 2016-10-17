'use strict';
const fix = value => {
	if (!/^0[a-zA-Z]/.test(value)) {
		return value;
	}

	const indicator = value[1].toLowerCase();
	const val = value.substring(2).toUpperCase();

	return `0${indicator}${val}`;
};

const create = context => {
	return {
		Literal: node => {
			const value = node.raw;
			const fixedValue = fix(value);

			if (value !== fixedValue) {
				context.report({
					node,
					message: 'Invalid number literal casing',
					fix: fixer => fixer.replaceText(node, fixedValue)
				});
			}
		}
	};
};

module.exports = {
	meta: {
		meta: {
			docs: {
				description: 'Enforce a lowercase literal identifier and an uppercase value',
				recommended: 'error'
			}
		},
		fixable: 'code'
	},
	create
};
