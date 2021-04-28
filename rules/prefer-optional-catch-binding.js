'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {isOpeningParenToken, isClosingParenToken} = require('eslint-utils');
const assertToken = require('./utils/assert-token');

const MESSAGE_ID_WITH_NAME = 'with-name';
const MESSAGE_ID_WITHOUT_NAME = 'without-name';
const messages = {
	[MESSAGE_ID_WITH_NAME]: 'Remove unused catch binding `{{name}}`.',
	[MESSAGE_ID_WITHOUT_NAME]: 'Remove unused catch binding.'
};

const selector = [
	'CatchClause',
	'>',
	'.param'
].join('');

const create = context => {
	return {
		[selector]: node => {
			const variables = context.getDeclaredVariables(node.parent);

			if (variables.some(variable => variable.references.length > 0)) {
				return;
			}

			const {type, name, parent} = node;

			context.report({
				node,
				messageId: type === 'Identifier' ? MESSAGE_ID_WITH_NAME : MESSAGE_ID_WITHOUT_NAME,
				data: {name},
				* fix(fixer) {
					const tokenBefore = context.getTokenBefore(node);
					assertToken(tokenBefore, {
						test: isOpeningParenToken,
						expected: '(',
						ruleId: 'prefer-optional-catch-binding'
					});

					const tokenAfter = context.getTokenAfter(node);
					assertToken(tokenAfter, {
						test: isClosingParenToken,
						expected: ')',
						ruleId: 'prefer-optional-catch-binding'
					});

					yield fixer.remove(tokenBefore);
					yield fixer.remove(node);
					yield fixer.remove(tokenAfter);

					const [, endOfClosingParenthesis] = tokenAfter.range;
					const [startOfCatchClauseBody] = parent.body.range;
					const text = context.getSourceCode().text.slice(endOfClosingParenthesis, startOfCatchClauseBody);
					const leadingSpacesLength = text.length - text.trimStart().length;
					if (leadingSpacesLength !== 0) {
						yield fixer.removeRange([endOfClosingParenthesis, endOfClosingParenthesis + leadingSpacesLength]);
					}
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
			description: 'Prefer omitting the `catch` binding parameter.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
