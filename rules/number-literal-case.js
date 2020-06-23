'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'number-literal-case';

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
