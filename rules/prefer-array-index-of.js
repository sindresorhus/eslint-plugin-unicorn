'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const simpleArraySearchRule = require('./shared/simple-array-search-rule');

const {messages, createListeners} = simpleArraySearchRule({
	method: 'findIndex',
	replacement: 'indexOf'
});

const create = context => createListeners(context);

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
