'use strict';
const {isNodesEqual} = require('./utils/index.js');

const MESSAGE_ID_ERROR = 'prefer-math-abs/error';
const MESSAGE_ID_SUGGESTION = 'prefer-math-abs/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
 *
 * @param {import('estree').Node} node
 * @returns {import('estree').Node}
 */
function unSignsNode(node) {
	if (node.type === 'UnaryExpression' && ['-', '+'].includes(node.operator)) {
		return unSignsNode(node.argument);
	}

	return node;
}

/**
 *
 * @param {import('estree').Node} node
 * @returns {node is import('estree').UnaryExpression}
 */
function isUnaryExpression(node) {
	return node.type === 'UnaryExpression';
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').ConditionalExpression} node */
	'ConditionalExpression[test.type="BinaryExpression"]'(node) {
		/** @type { { test: import('estree').BinaryExpression } } */
		const {test} = node;

		if (test.right.type !== 'Literal' && test.right.value !== 0) {
			return;
		}

		let found = false;

		if (['<', '<='].includes(test.operator) && isNodesEqual(test.left, unSignsNode(node.alternate)) && isUnaryExpression(node.consequent) && node.consequent.operator === '-') {
			switch (node.alternate.type) {
				case 'UnaryExpression': {
					if (node.alternate.operator === '+' && isNodesEqual(node.consequent.argument, node.alternate.argument)) {
						found = true;
					}

					break;
				}

				default: {
					if (isNodesEqual(node.consequent.argument, node.alternate)) {
						found = true;
					}

					break;
				}
			}
		}

		if (['>', '>='].includes(test.operator) && isNodesEqual(test.left, unSignsNode(node.consequent)) && node.alternate.type === 'UnaryExpression' && node.alternate.operator === '-') {
			switch (node.consequent.type) {
				case 'UnaryExpression': {
					if (node.consequent.operator === '+' && isNodesEqual(node.alternate.argument, node.consequent.argument)) {
						found = true;
					}

					break;
				}

				default: {
					if (isNodesEqual(node.alternate.argument, node.consequent)) {
						found = true;
					}

					break;
				}
			}
		}

		if (found) {
			const source = context.sourceCode.getText(node);
			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: source,
					replacement: 'Math.abs',
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, `Math.abs(${context.sourceCode.getText(test.left).replace(/^-/, '')})`),

				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: source,
							replacement: 'Math.abs',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node, `Math.abs(${context.sourceCode.getText(test.left).replace(/^-/, '')})`),
					},
				],
			});
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Math.abs` in some calculation cases',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
