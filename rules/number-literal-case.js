'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const fix = (raw, isBigInt) => {
	let fixed = raw.toLowerCase();
	if (fixed.startsWith('0x')) {
		fixed = '0x' + fixed.slice(2).toUpperCase();

		if (isBigInt) {
			fixed = fixed.slice(0, -1) + 'n';
		}
	}

	return fixed;
};

const create = context => {
	return {
		Literal: node => {
			const {value, raw, bigint} = node;
			const isBigInt = Boolean(bigint);

			if (typeof value !== 'number' && !isBigInt) {
				return;
			}

			const fixed = fix(raw, isBigInt);

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
