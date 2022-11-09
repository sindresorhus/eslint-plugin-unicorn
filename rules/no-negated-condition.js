/*
Based on ESLint builtin `no-negated-condition` rule
https://github.com/eslint/eslint/blob/5c39425fc55ecc0b97bbd07ac22654c0eb4f789c/lib/rules/no-negated-condition.js
*/
'use strict';
const {matches} = require('./selectors/index.js');
const {} = require('./fix/index.js');

const MESSAGE_ID= 'no-negated-condition';
const messages = {
	[MESSAGE_ID]: 'Unexpected negated condition.',
};

const selector = [
	matches([
		'IfStatement[alternate][alternate.type!="IfStatement"]',
		'ConditionalExpression',
	]),
	matches([
		'[test.type="UnaryExpression"][test.operator="!"]',
		'[test.type="BinaryExpression"][test.operator="!="]',
		'[test.type="BinaryExpression"][test.operator="!=="]',
	]),
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			return {
				node,
				messageId: MESSAGE_ID
				// /** @param {import('eslint').Rule.RuleFixer} fixer */
				// fix: fixer => fixer.replaceText(node, '\'🦄\''),
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
