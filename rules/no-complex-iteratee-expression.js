'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-complex-iteratee-expression';
const messages = {
	[MESSAGE_ID]: 'Move the complex iteratee expression out of the "for-of" header.'
};

// Keep either the function or the selector
// function isComplexIteratee(node) {
// 	if (
// 		// Allow variables
// 		node.type === 'Identifier' ||
// 		// Allow property access (`a.b.c`)
// 		node.type === 'MemberExpression' ||
// 		// Allow function calls with no arguments (`fun()` and `a.b.c()`)
// 		(node.type === 'CallExpression' && node.arguments.length === 0)
// 	) {
// 		return false;
// 	}
// 	// Allow some built-ins function calls (`Object.keys/values/entries()`)
// 	if (node.type === 'CallExpression' &&
// 		node.callee.type === 'MemberExpression' &&
// 		node.callee.object.type === 'Identifier' &&
// 		node.callee.object.name === 'Object' &&
// 		node.callee.property.type === 'Identifier' &&
// 		['keys', 'values', 'entries'].includes(node.callee.property.name)) {
// 		return false;
// 	}
// 	return true;
// }

const complexForSelector = [
	'ForOfStatement',
	`:matches(${
		[
			// Allow some specific `Object` methods (`Object.keys/values/entries`)
			[
				'[right.type="CallExpression"]',
				'[right.callee.type="MemberExpression"]',
				'[right.callee.object.type="Identifier"]',
				'[right.callee.object.name="Object"]',
				'[right.callee.property.type="Identifier"]',
				'[right.callee.property.name!="keys"]',
				'[right.callee.property.name!="values"]',
				'[right.callee.property.name!="entries"]',
				'[right.arguments.length>0]'
			].join(''),
			// Disallow every call with arguments (except if they are object, in that case it is already handled above)
			[
				'[right.type="CallExpression"]',
				'[right.callee.object.name!="Object"]',
				'[right.arguments.length>0]'
			].join('')
		].join(', ')
	})`
].join('');

const create = context => {
	return {
		[complexForSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID
				// TODO: Add an auto-fixer
				// fix: fixer => fixer.replaceText(node, '\'🦄\'')
			});
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: '',
		schema,
		messages
	}
};
