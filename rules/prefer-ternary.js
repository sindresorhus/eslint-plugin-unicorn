'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'prefer-ternary';

const selector = [
	'IfStatement',
	'[test.type!="ConditionalExpression"]',
	'[consequent]',
	'[alternate]'
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

function isSameAssignmentLeft(node1, node2) {
	// [TBD]: Allow more types of left
	return node1.type === node2.type && node1.type === 'Identifier' && node1.name === node2.name;
}

const create = context => {
	const sourceCode = context.getSourceCode();

	const getParenthesizedText = node => {
		const text = sourceCode.getText(node);
		return (
			isParenthesized(node, sourceCode) ||
			node.type === 'AwaitExpression' ||
			// Lower precedence, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
			node.type === 'AssignmentExpression' ||
			node.type === 'YieldExpression' ||
			node.type === 'SequenceExpression'
		) ?
			`(${text})` : text;
	};

	function merge(options, returnFalseIfNotMergeable = false) {
		const {
			before = '',
			after = ';',
			consequent,
			alternate
		} = options;

		if (!consequent || !alternate || consequent.type !== alternate.type) {
			return returnFalseIfNotMergeable ? false : options;
		}

		const {type} = consequent;

		if (
			type === 'ReturnStatement' &&
			consequent.argument &&
			alternate.argument &&
			!isTernary(consequent.argument) &&
			!isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}return `,
				after,
				consequent: consequent.argument,
				alternate: alternate.argument
			});
		}

		if (
			type === 'YieldExpression' &&
			consequent.delegate === alternate.delegate &&
			consequent.argument &&
			alternate.argument &&
			!isTernary(consequent.argument) &&
			!isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}yield${consequent.delegate ? '*' : ''} (`,
				after: `)${after}`,
				consequent: consequent.argument,
				alternate: alternate.argument
			});
		}

		if (
			type === 'AwaitExpression' &&
			!isTernary(consequent.argument) &&
			!isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}await (`,
				after: `)${after}`,
				consequent: consequent.argument,
				alternate: alternate.argument
			});
		}

		if (
			type === 'ThrowStatement' &&
			!isTernary(consequent.argument) &&
			!isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}throw `,
				after,
				consequent: consequent.argument,
				alternate: alternate.argument
			});
		}

		if (
			type === 'AssignmentExpression' &&
			isSameAssignmentLeft(consequent.left, alternate.left) &&
			!isTernary(consequent.left) &&
			!isTernary(alternate.left) &&
			!isTernary(consequent.right) &&
			!isTernary(alternate.right)
		) {
			return merge({
				before: `${before}${sourceCode.getText(consequent.left)} = `,
				after,
				consequent: consequent.right,
				alternate: alternate.right
			});
		}

		return returnFalseIfNotMergeable ? false : options;
	}

	return {
		[selector](node) {
			const consequent = getNodeBody(node.consequent);
			const alternate = getNodeBody(node.alternate);

			const result = merge({consequent, alternate}, true);

			if (!result) {
				return;
			}

			context.report({
				node,
				messageId,
				fix: fixer => {
					const fixed = `${result.before}${getParenthesizedText(node.test)} ? ${getParenthesizedText(result.consequent)} : ${getParenthesizedText(result.alternate)}${result.after}`;
					return fixer.replaceText(
						node,
						fixed
					);
				}
			});
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
			[messageId]: 'This `if` statement can be replaced by a ternary expression.'
		},
		fixable: 'code'
	}
};
