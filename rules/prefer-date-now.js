'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_METHOD = 'prefer-date-now-over-methods';
const MESSAGE_ID_NUMBER = 'prefer-date-now-over-number-data-object';
const messages = {
	[MESSAGE_ID_METHOD]: 'Prefer `Date.now()` over `Date#{{name}}()`.',
	[MESSAGE_ID_NUMBER]: 'Prefer `Date.now()` over `Number(new Date())`.'
};

const createNewDateSelector = path => {
	const prefix = property ? `${property}.` : '';
	return [
		`[${prefix}type="NewExpression"]`,
		`[${prefix}callee.type="Identifier"]`,
		`[${prefix}callee.name="Date"]`,
		`[${prefix}callee.arguments.length=0]`
	].join('');
};
const methodsSelector = [
	methodSelector({
		names: ['getTime', 'valueOf'],
		length: 0
	}),
	createNewDateSelector('callee.object'),
].join('');
const numberSelector = [
	'CallExpression',
	'[callee.type="Identifier"]',
	'[callee.name="Number"]',
	'[arguments.length=1]',
	createNewDateSelector('arguments.0')
].join('');


const create = context => {
	return {
		[methodsSelector](node) {
			const method = node.callee.property;
			context.report({
				node: method,
				messageId: MESSAGE_ID_METHOD,
				data: {method: method.name},
				fix: fixer => fixer.replaceText(node, 'Date.now()')
			});
		}
		[numberSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_NUMBER,
				fix: fixer => fixer.replaceText(node, 'Date.now()')
			});
		}
	}
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
