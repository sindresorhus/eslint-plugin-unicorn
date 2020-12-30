'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {isBooleanNode} = require('./utils/boolean');

const MESSAGE_ID_REGEXP_EXEC = 'regexp-exec';
const MESSAGE_ID_STRING_MATCH = 'string-match';
const messages = {
	[MESSAGE_ID_REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[MESSAGE_ID_STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.',
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
			if (isBooleanNode(node)) {
				node = node.callee.property;
				context.report({
					node,
					messageId: MESSAGE_ID_REGEXP_EXEC,
					fix: fixer => fixer.replaceText(node, 'test')
				});
			}
		},
		[stringMatchCallSelector](node) {
			if (!isBooleanNode(node)) {
				return;
			}

			const stringNode = node.callee.object;
			const regexpNode = node.arguments[0];

			context.report({
				node,
				messageId: MESSAGE_ID_STRING_MATCH,
				* fix(fixer) {
					yield fixer.replaceText(stringNode, sourceCode.getText(regexpNode));
					yield fixer.replaceText(node.callee.property, 'test');
					yield fixer.replaceText(regexpNode, sourceCode.getText(stringNode));
				}
			});
		}
	}
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
