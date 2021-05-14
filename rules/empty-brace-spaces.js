'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const toLocation = require('./utils/to-location');

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.'
};

const selector = `:matches(${
	[
		'BlockStatement[body.length=0]',
		'ClassBody[body.length=0]',
		'ObjectExpression[properties.length=0]'
	].join(', ')
})`;

const create = context => {
	const sourceCode = context.getSourceCode();
	const START_OFFSET = 1;
	const END_OFFSET = -1;

	return {
		[selector](node) {
			if (!/^\s+$/.test(sourceCode.getText(node, START_OFFSET, END_OFFSET))) {
				return;
			}

			context.report({
				loc: toLocation(node, sourceCode, START_OFFSET, END_OFFSET),
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceTextRange([start, end], '')
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce no spaces between braces.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'whitespace',
		schema: [],
		messages
	}
};
