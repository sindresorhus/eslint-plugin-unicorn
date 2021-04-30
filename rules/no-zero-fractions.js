'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {isNumber, parseNumber, parseFloat} = require('./utils/numeric');

const MESSAGE_ZERO_FRACTION = 'zero-fraction';
const MESSAGE_DANGLING_DOT = 'dangling-dot';
const messages = {
	[MESSAGE_ZERO_FRACTION]: 'Don\'t use a zero fraction in the number.',
	[MESSAGE_DANGLING_DOT]: 'Don\'t use a dangling dot in the number.'
};

const format = text => {
	// Legacy octal number `0777` and prefixed number `0o1234` can't has dot.
	const {number, mark, sign, power} = parseNumber(text);
	const {integer, dot, fractional} = parseFloat(number);
	return {
		hasDanglingDot: !fractional,
		formatted: integer + (dot + fractional).replace(/[0_.]+$/g, '') + mark + sign + power
	};
}

const create = context => {
	return {
		Literal: node => {
			const {raw} = node;
			if (!isNumber(node) || !raw.includes('.')) {
				return;
			}

			const {hasDanglingDot, formatted} = format(raw);
			if (formatted === raw) {
				return;
			}

			context.report({
				node,
				messageId: hasDanglingDot ? MESSAGE_DANGLING_DOT : MESSAGE_ZERO_FRACTION,
				fix: fixer => fixer.replaceText(node, formatted)
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow number literals with zero fractions or dangling dots.',
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code',
		schema: []
	}
};
