'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const fix = (value, isBigInt) => {
	value = value.toLowerCase();
	if (value.startsWith('0x')) {
		value = '0x' + value.slice(2).toUpperCase();
	}

	return `${value}${isBigInt ? 'n' : ''}`;
};

const create = context => {
	return {
		Literal: node => {
			const {value, raw, bigint} = node;
			const isBigInt = Boolean(bigint);

			if (typeof value !== 'number' && !isBigInt) {
				return;
			}

			const fixed = fix(isBigInt ? bigint : raw, isBigInt);

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
