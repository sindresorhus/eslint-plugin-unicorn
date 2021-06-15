'use strict';
const {matches} = require('./selectors/index.js');

const messageId = 'throw-new-error';
const messages = {
	[messageId]: 'Use `new` when throwing an error.'
};

const customError = /^(?:[A-Z][\da-z]*)*Error$/;

const selector = [
	'ThrowStatement',
	' > ',
	'CallExpression.argument',
	matches([
		// `throw FooError()`
		[
			'[callee.type="Identifier"]',
			`[callee.name=/${customError.source}/]`
		].join(''),
		// `throw lib.FooError()`
		[
			'[callee.type="MemberExpression"]',
			'[callee.computed=false]',
			'[callee.property.type="Identifier"]',
			`[callee.property.name=/${customError.source}/]`
		].join('')
	])
].join('');

const create = () => ({
	[selector]: node => {
		return {
			node,
			messageId,
			fix: fixer => fixer.insertTextBefore(node, 'new ')
		};
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `new` when throwing an error.'
		},
		fixable: 'code',
		messages
	}
};
