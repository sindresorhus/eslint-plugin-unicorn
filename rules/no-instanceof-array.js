'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-instanceof-array';
const messages = {
	[MESSAGE_ID]: 'Use `Array.isArray()` instead of `instanceof Array`.'
};
const selector = [
	'BinaryExpression',
	'[operator="instanceof"]',
	'[right.type="Identifier"]',
	'[right.name="Array"]'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector]: node => context.report({
			node,
			messageId: MESSAGE_ID,
			fix: fixer => fixer.replaceText(
				node,
				`Array.isArray(${sourceCode.getText(node.left)})`
			)
		})
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
