'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

// The number of chars in "Object.create("
const objectCreateCharCount = 14;
const objectCreate = 'Object.create(null';
// Check if the 14 chars preceding `null` are "Object.create("
const isObjectCreate = (context, node) => context.getSource(node, objectCreateCharCount) === objectCreate;

const create = context => ({
	Literal: node => {
		if (node.raw === 'null' && !isObjectCreate(context, node)) {
			context.report({
				node,
				message: 'Use undefined instead of null'
			});
		}
	}
});

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		}
	},
	create
};
