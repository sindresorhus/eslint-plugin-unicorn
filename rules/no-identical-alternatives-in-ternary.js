'use strict';

const {isNodesEqual, findIndexOfQuestionMarkInConditionalExpression, getParenthesizedRange} = require('./utils/index.js');

const MESSAGE_ID = 'no-identical-alternatives-in-ternary';
const messages = {
	[MESSAGE_ID]:
		'Replace repeated alternatives of ternary expressions with a logical expression.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').ConditionalExpression} node */
	ConditionalExpression(node) {
		// Check if the alternate is a ConditionalExpression
		if (node.alternate && node.consequent.type === 'ConditionalExpression') {
			const {test: _outerTest, consequent: _outerConsequent, alternate: outerAlternate} = node;
			const {test: _innerTest, consequent: _innerConsequent, alternate: innerAlternate} = node.consequent;

			const {sourceCode} = context;

			if (isNodesEqual(outerAlternate, innerAlternate)) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					* fix(fixer) {
						// Find the index of the question mark in the outer ConditionalExpression
						const questionMarkIndex = findIndexOfQuestionMarkInConditionalExpression(node, sourceCode);

						// Replace the ? with &&
						yield fixer.replaceTextRange([questionMarkIndex, questionMarkIndex + 1], '&&');

						// Remove the repeated alternative
						const [alternativeStart, alternativeEnd] = getParenthesizedRange(innerAlternate, sourceCode);
						yield fixer.replaceTextRange([alternativeStart, node.range[1]], sourceCode.getText().slice(alternativeStart, alternativeEnd));
					},
				});
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow nested ternary expressions with repeated alternatives.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
