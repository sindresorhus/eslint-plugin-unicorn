'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const fix = value => {
	if (!/^0[a-zA-Z]/.test(value)) {
		return value;
	}

	const indicator = value[1].toLowerCase();
	const newValue = value.slice(2).toUpperCase();

	return `0${indicator}${newValue}`;
};

const create = context => {
	return {
		Literal: node => {
			const value = node.raw;
			const fixedValue = fix(value);

			if (value !== fixedValue) {
				context.report({
					node,
					message: 'Invalid number literal casing.',
					fix: fixer => fixer.replaceText(node, fixedValue)
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
