'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const simpleArraySearchRule = require('./shared/simple-array-search-rule');

const {messages, createListeners} = simpleArraySearchRule();

module.exports = {
	create: context => createListeners(context),
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
