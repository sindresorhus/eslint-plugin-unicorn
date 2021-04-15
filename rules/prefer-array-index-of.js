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
			description: 'Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
