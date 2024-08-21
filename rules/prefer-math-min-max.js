'use strict';

const MESSAGE_ID = 'prefer-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` to simplify ternary expressions.',
};

/**
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').ConditionalExpression} node
@param {import('estree').Node} left
@param {import('estree').Node} right
@param {string} method
*/
function reportPreferMathMinOrMax(context, node, left, right, method) {
	const {sourceCode} = context;

	return {
		node,
		messageId: MESSAGE_ID,
		data: {
			replacement: `${method}()`,
		},
		* fix(fixer) {
			/**
			 * ```js
			 * function a() {
			 *   return+foo > 10 ? 10 : +foo
			 * }
			 * ```
			 */
			if (node.parent.type === 'ReturnStatement' && node.parent.argument === node && node.parent.start + 'return'.length === node.start) {
				// If there is no space between ReturnStatement and ConditionalExpression, add a space.
				yield fixer.insertTextBefore(node, ' ');
			}

			let leftText = sourceCode.getText(left);
			let rightText = sourceCode.getText(right);

			if (left.type === 'SequenceExpression') {
				leftText = `(${leftText})`;
			}

			if (right.type === 'SequenceExpression') {
				rightText = `(${rightText})`;
			}

			yield fixer.replaceText(node, `${method}(${leftText}, ${rightText})`);
		},
	};
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
				return reportPreferMathMinOrMax(context, node, left, right, 'Math.min');
			}

			if (leftCode === consequentCode && rightCode === alternateCode) {
				// Example `height > 50 ? height : 50`
				// Prefer `Math.max()`
				return reportPreferMathMinOrMax(context, node, left, right, 'Math.max');
			}
		} else if (['<', '<='].includes(operator)) {
			if (leftCode === consequentCode && rightCode === alternateCode) {
				// Example `height < 50 ? height : 50`
				// Prefer `Math.min()`
				return reportPreferMathMinOrMax(context, node, left, right, 'Math.min');
			}

			if (leftCode === alternateCode && rightCode === consequentCode) {
				// Example `height < 50 ? 50 : height`
				// Prefer `Math.max()`
				return reportPreferMathMinOrMax(context, node, left, right, 'Math.max');
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
