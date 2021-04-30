'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {isNumber} = require('./utils/numeric');

const MESSAGE_ZERO_FRACTION = 'zero-fraction';
const MESSAGE_DANGLING_DOT = 'dangling-dot';
const messages = {
	[MESSAGE_ZERO_FRACTION]: 'Don\'t use a zero fraction in the number.',
	[MESSAGE_DANGLING_DOT]: 'Don\'t use a dangling dot in the number.'
};

const create = context => {
	return {
		Literal: node => {
			if (!isNumber(node)) {
				return;
			}

			// Legacy octal number `0777` and prefixed number `0o1234` can't has dot.
			const {raw} = node;
			const match = raw.match(/^(?<before>[\d_]*)(?<dotAndFraction>\.[\d_]*)(?<after>.*)$/);
			if (!match) {
				return;
			}

			const {before, dotAndFraction, after} = match.groups;
			const formatted = before + dotAndFraction.replace(/[0_.]+$/g, '') + after;

			if (formatted === raw) {
				return;
			}

			const hasDanglingDot = dotAndFraction.length === 1;
			// End of fractional
			const end = node.range[0] + before.length + dotAndFraction.length;
			const start = end - (raw.length - formatted.length);
			const sourceCode = context.getSourceCode();
			context.report({
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(end)
				},
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
