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

	return {
		[selector](node) {
			if (!/^\s+$/.test(sourceCode.getText(node, 1, -1))) {
				return;
			}

			const [start, end] = node.range;
			const range = [start + 1, end - 1];
			context.report({
				loc: toLocation(range, sourceCode),
				messageId: MESSAGE_ID,
				fix: fixer => fixer.removeRange(range)
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
