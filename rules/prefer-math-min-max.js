'use strict';

const MESSAGE_ID = 'prefer-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` to simplify ternary expressions.',
};

/**
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').ConditionalExpression} node
@param {string} method
*/
function reportPreferMathMinOrMax(context, node, left, right, method) {
	const {sourceCode} = context;

	context.report({
		node,
		messageId: MESSAGE_ID,
		data: {
			replacement: `${method}()`,
		},
		fix: fixer => fixer.replaceText(node, `${method}(${sourceCode.getText(left)}, ${sourceCode.getText(right)})`),
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').ConditionalExpression} node */
	ConditionalExpression(node) {
		const {test, consequent, alternate} = node;

		if (test.type !== 'BinaryExpression') {
			return;
		}

		const {sourceCode} = context;
		const {operator, left, right} = test;

		const leftCode = sourceCode.getText(left);
		const rightCode = sourceCode.getText(right);
		const alternateCode = sourceCode.getText(alternate);
		const consequentCode = sourceCode.getText(consequent);

		if (['>', '>='].includes(operator)) {
			if (leftCode === alternateCode && rightCode === consequentCode) {
				// Example `height > 50 ? 50 : height`
				// Prefer `Math.min()`
				reportPreferMathMinOrMax(context, node, left, right, 'Math.min');
			} else if (leftCode === consequentCode && rightCode === alternateCode) {
				// Example `height > 50 ? height : 50`
				// Prefer `Math.max()`
				reportPreferMathMinOrMax(context, node, left, right, 'Math.max');
			}
		} else if (['<', '<='].includes(operator)) {
			if (leftCode === consequentCode && rightCode === alternateCode) {
				// Example `height < 50 ? height : 50`
				// Prefer `Math.min()`
				reportPreferMathMinOrMax(context, node, left, right, 'Math.min');
			} else if (leftCode === alternateCode && rightCode === consequentCode) {
				// Example `height < 50 ? 50 : height`
				// Prefer `Math.max()`
				reportPreferMathMinOrMax(context, node, left, right, 'Math.max');
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
			description: 'Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
