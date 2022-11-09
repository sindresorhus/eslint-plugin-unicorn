/*
Based on ESLint builtin `no-negated-condition` rule
https://github.com/eslint/eslint/blob/5c39425fc55ecc0b97bbd07ac22654c0eb4f789c/lib/rules/no-negated-condition.js
*/
'use strict';
const {} = require('./selectors/index.js');
const {} = require('./fix/index.js');

const MESSAGE_ID= 'no-negated-condition';
const messages = {
	[MESSAGE_ID]: 'Unexpected negated condition.',
};

/**
Determines if a given node is an if-else without a condition on the else
@param {ASTNode} node The node to check.
@returns {boolean} True if the node has an else without an if.
@private
*/
function hasElseWithoutCondition(node) {
	return node.alternate && node.alternate.type !== "IfStatement";
}

/**
Determines if a given node is a negated unary expression
@param {Object} test The test object to check.
@returns {boolean} True if the node is a negated unary expression.
@private
*/
function isNegatedUnaryExpression(test) {
	return test.type === "UnaryExpression" && test.operator === "!";
}

/**
Determines if a given node is a negated binary expression
@param {Test} test The test to check.
@returns {boolean} True if the node is a negated binary expression.
@private
*/
function isNegatedBinaryExpression(test) {
	return test.type === "BinaryExpression" &&
		(test.operator === "!=" || test.operator === "!==");
}

/**
Determines if a given node has a negated if expression
@param {ASTNode} node The node to check.
@returns {boolean} True if the node has a negated if expression.
@private
*/
function isNegatedIf(node) {
	return isNegatedUnaryExpression(node.test) || isNegatedBinaryExpression(node.test);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		IfStatement(node) {
			if (!hasElseWithoutCondition(node) || !isNegatedIf(node)) {
				return;
			}

			return {
					node,
					messageId: MESSAGE_ID
					// /** @param {import('eslint').Rule.RuleFixer} fixer */
					// fix: fixer => fixer.replaceText(node, '\'🦄\''),
			};
		},
		ConditionalExpression(node) {
			if (!isNegatedIf(node)) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID
			};
		}
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow negated conditions.',
		},
		fixable: 'code',
		messages,
	},
};
