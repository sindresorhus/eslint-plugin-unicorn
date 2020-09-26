'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const fix = raw => {
	let fixed = raw.toLowerCase();
	if (fixed.startsWith('0x')) {
		fixed = '0x' + fixed.slice(2).toUpperCase();
	}

	return fixed;
};

const create = context => {
	return {
		Literal: node => {
			const {value, raw, bigint} = node;

			let fixed = raw;
			if (typeof value === 'number') {
				fixed = fix(raw);
			} else if (bigint) {
				fixed = fix(raw.slice(0, -1)) + 'n';
			}

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
