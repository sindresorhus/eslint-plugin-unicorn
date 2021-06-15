'use strict';
const {isNumber, isBigInt} = require('./utils/numeric.js');

const MESSAGE_ID = 'number-literal-case';
const messages = {
	[MESSAGE_ID]: 'Invalid number literal casing.'
};

const fix = raw => {
	let fixed = raw.toLowerCase();
	if (fixed.startsWith('0x')) {
		fixed = '0x' + fixed.slice(2).toUpperCase();
	}

	return fixed;
};

const create = () => {
	return {
		Literal: node => {
			const {raw} = node;

			let fixed = raw;
			if (isNumber(node)) {
				fixed = fix(raw);
			} else if (isBigInt(node)) {
				fixed = fix(raw.slice(0, -1)) + 'n';
			}

			if (raw !== fixed) {
				return {
					node,
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, fixed)
				};
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce proper case for numeric literals.'
		},
		fixable: 'code',
		messages
	}
};
