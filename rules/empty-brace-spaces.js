'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

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
			let [start, end] = node.range;
			start += 1;
			end -= 1;

			if (!/^\s+$/.test(sourceCode.text.slice(start, end))) {
				return;
			}

			context.report({
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(end)
				},
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
		messages,
		schema: []
	}
};
