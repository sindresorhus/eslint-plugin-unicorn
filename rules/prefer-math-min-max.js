'use strict';
const {fixSpaceAroundKeyword} = require('./fix/index.js');

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
			/** @type {{parent: import('estree'.Node)}} */
			const {parent} = node;
			if (
				// Edge case: `return+foo > 10 ? 10 : +foo`
				(parent.type === 'ReturnStatement' && parent.argument === node && parent.start + 'return'.length === node.start)
				// Edge case:  `yield+foo > 10 ? 10 : foo`
				|| (parent.type === 'YieldExpression' && parent.argument === node && parent.start + 'yield'.length === node.start)
			) {
				// If there is no space between ReturnStatement and ConditionalExpression, add a space.
				yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
			}

			/**
			 * Fix edge case:
			 * ```js
			 * (0,foo) > 10 ? 10 : (0,foo)
			 * ```
			 */
			const leftText = left.type === 'SequenceExpression' ? `(${sourceCode.getText(left)})` : sourceCode.getText(left);
			const rightText = right.type === 'SequenceExpression' ? `(${sourceCode.getText(right)})` : sourceCode.getText(right);

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
		const [leftCode, rightCode, alternateCode, consequentCode] = [left, right, alternate, consequent].map(n => sourceCode.getText(n));

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
