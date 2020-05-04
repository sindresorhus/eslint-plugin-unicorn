'use strict';
const {isCommaToken} = require('eslint-utils')
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'no-useless-undefined';

const create = context => {
	return {
		'ReturnStatement > Identifier.argument[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => fixer.replaceText(node, '')
			})
		},
		'YieldExpression > Identifier.argument[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => fixer.replaceText(node, '')
			})
		},
		'ArrowFunctionExpression > Identifier.body[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => fixer.replaceText(node, '{}')
			})
		},
		'VariableDeclaration[kind!="const"] > VariableDeclarator > Identifier.init[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => fixer.removeRange([node.parent.id.range[1], node.range[1]])
			})
		},
		'AssignmentPattern > Identifier.right[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => fixer.removeRange([node.parent.left.range[1], node.range[1]])
			})
		},
		'CallExpression > Identifier.arguments:last-child[name="undefined"]'(node) {
			context.report({
				node,
				messageId,
				fix: fixer => {
					const fixes = [fixer.replaceText(node, '')];
					const tokenAfter = context.getTokenAfter(node);
					if (isCommaToken(tokenAfter)) {
						fixes.push(fixer.replaceText(tokenAfter, ''))
					}
					return fixes
				}
			})
		}
	}
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[messageId]: 'Do not use `undefined`.'
		},
		fixable: 'code'
	}
};
