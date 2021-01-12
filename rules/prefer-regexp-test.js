'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {isBooleanNode} = require('./utils/boolean');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');

const MESSAGE_ID_REGEXP_EXEC = 'regexp-exec';
const MESSAGE_ID_STRING_MATCH = 'string-match';
const messages = {
	[MESSAGE_ID_REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[MESSAGE_ID_STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.'
};

const regExpExecCallSelector = methodSelector({
	name: 'exec',
	length: 1
});

const stringMatchCallSelector = methodSelector({
	name: 'match',
	length: 1
});

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[regExpExecCallSelector](node) {
			if (!isBooleanNode(node)) {
				return;
			}

			node = node.callee.property;
			context.report({
				node,
				messageId: MESSAGE_ID_REGEXP_EXEC,
				fix: fixer => fixer.replaceText(node, 'test')
			});
		},
		[stringMatchCallSelector](node) {
			if (!isBooleanNode(node)) {
				return;
			}

			const regexpNode = node.arguments[0];

			if (regexpNode.type === 'Literal' && !regexpNode.regex) {
				return;
			}

			const stringNode = node.callee.object;

			context.report({
				node,
				messageId: MESSAGE_ID_STRING_MATCH,
				* fix(fixer) {
					yield fixer.replaceText(node.callee.property, 'test');

					let stringText = sourceCode.getText(stringNode);
					if (
						!isParenthesized(regexpNode, sourceCode) &&
						// Only `SequenceExpression` need add parentheses
						stringNode.type === 'SequenceExpression'
					) {
						stringText = `(${stringText})`;
					}

					yield fixer.replaceText(regexpNode, stringText);

					let regexpText = sourceCode.getText(regexpNode);
					if (
						!isParenthesized(stringNode, sourceCode) &&
						shouldAddParenthesesToMemberExpressionObject(regexpNode, sourceCode)
					) {
						regexpText = `(${regexpText})`;
					}

					// The nodes that pass `isBooleanNode` cannot have an ASI problem.

					yield fixer.replaceText(stringNode, regexpText);
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
