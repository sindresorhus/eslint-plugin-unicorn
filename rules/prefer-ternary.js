'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'prefer-ternary';

const selector = [
	'IfStatement',
	'[test.type!="ConditionalExpression"]',
	'[consequent]',
	'[alternate]',
].join('');

const isTernary = node => node && node.type === 'ConditionalExpression';


function getNodeBody(node) {
	if (!node) {
		return;
	}

	if (node.type === 'ExpressionStatement') {
		return getNodeBody(node.expression);
	}

	if (node.type === 'BlockStatement') {
		const body = node.body.filter(({type}) => type !== 'EmptyStatement');
		if (body.length === 1) {
			return getNodeBody(body[0]);
		}
	}

	return node;
}

function isSameNode(node1, node2) {
	// [TBD]: compare more type
	return node1.type == node2.type && node1.type === 'Identifier' && node1.name === node2.name;
}

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			const consequent = getNodeBody(node.consequent);
			const alternate = getNodeBody(node.alternate);

			if (!consequent || !alternate || consequent.type !== alternate.type) {
				return;
			}

			const {type} = consequent;
			let prefix = '';
			let left;
			let right;

			if (
				type === 'ReturnStatement' &&
				!isTernary(consequent.argument) &&
				!isTernary(alternate.argument)
			) {
				prefix = 'return ';
				left = consequent.argument;
				right = alternate.argument;
			}

			if (
				type === 'YieldStatement' &&
				consequent.delegate === alternate.delegate &&
				!isTernary(consequent.argument) &&
				!isTernary(alternate.argument)
			) {
				prefix = `yield${consequent.delegate ? '*' : ''} `;
				left = consequent.argument;
				right = alternate.argument;
			}

			if (
				type === 'AwaitExpression' &&
				!isTernary(consequent.argument) &&
				!isTernary(alternate.argument)
			) {
				prefix = `await `;
				left = consequent.argument;
				right = alternate.argument;
			}

			if (
				type === 'AssignmentExpression' &&
				isSameNode(consequent.left, alternate.left) &&
				!isTernary(consequent.left) &&
				!isTernary(alternate.left) &&
				!isTernary(consequent.right) &&
				!isTernary(alternate.right)
			) {
				prefix = sourceCode.getText(consequent.left) + ' = '
				left = consequent.right;
				right = alternate.right;
			}

			if (left && right) {
				left = sourceCode.getText(left);
				right = sourceCode.getText(right);
				const test = sourceCode.getText(node.test);
				context.report({
					node,
					messageId,
					fix: fixer => fixer.replaceText(
						node,
						`${prefix}(${test}) ? (${left}) : (${right})`
					)
				})
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[messageId]: 'This `if` statement can be replaced by a ternary expression.',
		},
		fixable: 'code'
	}
};
