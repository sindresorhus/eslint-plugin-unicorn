'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {findVariable, isOpeningParenToken, isClosingParenToken} = require('eslint-utils');

const ERROR_MESSAGE_ID = 'error';
const messages = {
	[ERROR_MESSAGE_ID]: 'Remove unused catch binding `{{name}}`.'
};

const selector = [
	'CatchClause',
	'>',
	'Identifier.param'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector]: node => {
			const scope = context.getScope();
			const variable = findVariable(scope, node);

			if (variable.references.length > 0) {
				return;
			}

			const {name} = node;

			context.report({
				node,
				messageId: ERROR_MESSAGE_ID,
				data: {name},
				* fix(fixer) {
					const tokenBefore = context.getTokenBefore(node);
					const tokenAfter = context.getTokenAfter(node);

					/* istanbul ignore next */
					if (!isOpeningParenToken(tokenBefore) || !isClosingParenToken(tokenAfter)) {
						throw new Error('Unexpected token.');
					}

					yield fixer.remove(tokenBefore);
					yield fixer.remove(node);
					yield fixer.remove(tokenAfter);

					const [, endOfClosingParenthesis] = tokenAfter.range;
					const [startOfCatchClauseBody] = node.parent.body.range;
					const text = sourceCode.text.slice(endOfClosingParenthesis, startOfCatchClauseBody);
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
