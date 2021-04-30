'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const needsSemicolon = require('./utils/needs-semicolon');
const {isNumber, isDecimalInteger} = require('./utils/numeric');

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

			// Legacy octal number `0777` and prefixed number `0o1234` cannot have a dot.
			const {raw} = node;
			const match = raw.match(/^(?<before>[\d_]*)(?<dotAndFractions>\.[\d_]*)(?<after>.*)$/);
			if (!match) {
				return;
			}

			const {before, dotAndFractions, after} = match.groups;
			const formatted = before + dotAndFractions.replace(/[.0_]+$/g, '') + after;

			if (formatted === raw) {
				return;
			}

			const isDanglingDot = dotAndFractions === '.';
			// End of fractions
			const end = node.range[0] + before.length + dotAndFractions.length;
			const start = end - (raw.length - formatted.length);
			const sourceCode = context.getSourceCode();
			context.report({
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(end)
				},
				messageId: isDanglingDot ? MESSAGE_DANGLING_DOT : MESSAGE_ZERO_FRACTION,
				fix: fixer => {
					let fixed = formatted;
					if (
						node.parent.type === 'MemberExpression' &&
						node.parent.object === node &&
						isDecimalInteger(formatted) &&
						!isParenthesized(node, sourceCode)
					) {
						fixed = `(${fixed})`;

						if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, fixed)) {
							fixed = `;${fixed}`;
						}
					}

					return fixer.replaceText(node, fixed);
				}
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
