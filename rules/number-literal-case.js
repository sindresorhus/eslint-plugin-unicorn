'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const fix = value => {
	if (!/^0[A-Za-z]/.test(value)) {
		return value;
	}

	const indicator = value[1].toLowerCase();
	const newValue = value.slice(2).toUpperCase();

	return `0${indicator}${newValue}`;
};

const create = context => {
	return {
		Literal: node => {
			const {value, raw} = node;
			if (typeof value !== 'number') {
				return;
			}
			const fixed = fix(raw);

			if (raw !== fixed) {
				context.report({
					node,
					message: 'Invalid number literal casing.',
					fix: fixer => fixer.replaceText(node, fixed)
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
