'use strict';
const simpleArraySearchRule = require('./shared/simple-array-search-rule.js');

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
			description: 'Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item.'
		},
		fixable: 'code',
		messages,
		hasSuggestions: true
	}
};
