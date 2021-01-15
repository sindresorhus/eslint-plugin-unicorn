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

const assignmentExpressionSelector = [
	'AssignmentExpression',
	'[right.type="ThisExpression"]',
	'[left.type="Identifier"]'
].join('');

const selector = `:matches(${variableDeclaratorSelector}, ${assignmentExpressionSelector})`;

const create = context => ({
	[selector](node) {
		const variable = node.type === 'AssignmentExpression' ? node.left : node.id;
		context.report({
			node,
			data: {name: variable.name},
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
