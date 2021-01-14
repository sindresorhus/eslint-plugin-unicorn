'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-this-assignment';
const messages = {
	[MESSAGE_ID]: 'Do not assign `this` to `{{name}}`.'
};

const variableDeclaratorSelector = [
	'VariableDeclarator',
	'[init.type="ThisExpression"]',
	'[id.type="Identifier"]'
].join('');

const create = context => ({
	[variableDeclaratorSelector](node) {
		context.report({
			node,
			data: {name: node.id.name},
			messageId: MESSAGE_ID
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
