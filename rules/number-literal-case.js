'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'number-literal-case';

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
					messageId: MESSAGE_ID,
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
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: 'Invalid number literal casing.'
		}
	}
};
