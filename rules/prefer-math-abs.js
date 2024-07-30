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

/**
 *
 * @param {import('estree').Node} node
 * @returns {node is import('estree').Literal}
 */
function isLiteral1(node) {
	return node.type === 'Literal' && node.value === 1;
}

/**
 *
 * @param {import('estree').Node} node
 * @returns {node is import('estree').UnaryExpression}
 */
function isNegative(node) {
	return node.type === 'UnaryExpression' && node.operator === '-';
}

/**
 *
 * @param {import('estree').Node} node
 * @returns {node is import('estree').UnaryExpression}
 */
function isNegativeLiteralNumber1(node) {
	return isNegative(node) && isLiteral1(node.argument);
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

		if (['<', '<='].includes(test.operator) && isNodesEqual(test.left, unSignsNode(node.alternate))) {
			if (isUnaryExpression(node.consequent) && node.consequent.operator === '-') {
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
			} else if (node.consequent.type === 'BinaryExpression' && node.consequent.operator === '*') {
				if (isNodesEqual(node.consequent.left, node.alternate) && isNegativeLiteralNumber1(node.consequent.right)) {
					found = true;
				} else if (isNodesEqual(node.consequent.right, node.alternate) && isNegativeLiteralNumber1(node.consequent.left)) {
					found = true;
				}
			}
		}

		if (['>', '>='].includes(test.operator) && isNodesEqual(test.left, unSignsNode(node.consequent))) {
			if (isUnaryExpression(node.alternate) && node.alternate.operator === '-') {
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
			} else if (node.alternate.type === 'BinaryExpression' && node.alternate.operator === '*') {
				if (isNodesEqual(node.alternate.left, node.consequent) && isNegativeLiteralNumber1(node.alternate.right)) {
					found = true;
				} else if (isNodesEqual(node.alternate.right, node.consequent) && isNegativeLiteralNumber1(node.alternate.left)) {
					found = true;
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
	/** @param {import('estree').IfStatement} node */
	IfStatement(node) {
		if (node.test.type === 'LogicalExpression' && node.test.operator === '||' && node.test.left.type === 'BinaryExpression' && node.test.right.type === 'BinaryExpression') {
			if (['>', '>='].includes(node.test.left.operator) && ['<', '<='].includes(node.test.right.operator)) {
				if (isNodesEqual(node.test.left.left, node.test.right.left) && isNegative(node.test.right.right) && isNodesEqual(node.test.left.right, node.test.right.right.argument)) {
					const source = context.sourceCode.getText(node.test);
					const identifierName = context.sourceCode.getText(node.test.left.left).replace(/^-/, '');
					context.report({
						node: node.test,
						messageId: MESSAGE_ID_ERROR,
						data: {
							value: source,
							replacement: 'Math.abs',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node.test, `Math.abs(${identifierName})`),

						/** @param {import('eslint').Rule.RuleFixer} fixer */
						suggest: [
							{
								messageId: MESSAGE_ID_SUGGESTION,
								data: {
									value: source,
									replacement: 'Math.abs',
								},
								/** @param {import('eslint').Rule.RuleFixer} fixer */
								fix: fixer => fixer.replaceText(node.test, `Math.abs(${identifierName})`),
							},
						],
					});
				}
			} else if (['<', '<='].includes(node.test.left.operator) && ['>', '>='].includes(node.test.right.operator) && isNodesEqual(node.test.left.left, node.test.right.left) && isNegative(node.test.left.right) && isNodesEqual(node.test.right.right, node.test.left.right.argument)) {
				const source = context.sourceCode.getText(node.test);
				const identifierName = context.sourceCode.getText(node.test.left.left).replace(/^-/, '');
				context.report({
					node: node.test,
					messageId: MESSAGE_ID_ERROR,
					data: {
						value: source,
						replacement: 'Math.abs',
					},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node.test, `Math.abs(${identifierName})`),

					/** @param {import('eslint').Rule.RuleFixer} fixer */
					suggest: [
						{
							messageId: MESSAGE_ID_SUGGESTION,
							data: {
								value: source,
								replacement: 'Math.abs',
							},
							/** @param {import('eslint').Rule.RuleFixer} fixer */
							fix: fixer => fixer.replaceText(node.test, `Math.abs(${identifierName})`),
						},
					],
				});
			}
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
