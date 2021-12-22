'use strict';
const {findVariable} = require('eslint-utils');
const {matches} = require('./selectors/index.js');

const MESSAGE_ID = 'NO_TYPEOF_UNDEFINED';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{operator}}` operator instead of typeof with \'undefined\'.',
};

const selector = [
	'BinaryExpression',
	matches(['[right.value=undefined]', '[left.value=undefined]']),
	' UnaryExpression[operator=typeof]',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	* [selector](node) {
		const {
			argument: variable,
			parent: binaryExpressionNode,
		} = node;
		const isVariableDeclared = Boolean(findVariable(context.getScope(), variable));

		if (isVariableDeclared) {
			const {operator} = binaryExpressionNode;
			yield {
				node: binaryExpressionNode,
				data: {operator},
				messageId: MESSAGE_ID,
				fix(fixer) {
					const code = [variable.name, operator, 'undefined'];
					return fixer.replaceText(binaryExpressionNode, (binaryExpressionNode.left.type === 'UnaryExpression' ? code : code.reverse()).join(' '));
				},
			};
		}
	},
});

const schema = [];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Forbid of comparison `typeof` with `\'undefined\'` if the variable is declared, imported or variable is a function parameter.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
