'use strict';
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const MESSAGE_ID = 'prefer-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `Math.{{method}}()` to simplify ternary expressions.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').ConditionalExpression} conditionalExpression */
	ConditionalExpression(conditionalExpression) {
		const {test, consequent, alternate} = conditionalExpression;

		if (test.type !== 'BinaryExpression') {
			return;
		}

		const {operator, left, right} = test;
		const [leftText, rightText, alternateText, consequentText] = [left, right, alternate, consequent].map(node => context.sourceCode.getText(node));

		const isGreaterOrEqual = operator === '>' || operator === '>=';
		const isLessOrEqual = operator === '<' || operator === '<=';

		let method;

		// Prefer `Math.min()`
		if (
			// `height > 50 ? 50 : height`
			(isGreaterOrEqual && leftText === alternateText && rightText === consequentText)
			// `height < 50 ? height : 50`
			|| (isLessOrEqual && leftText === consequentText && rightText === alternateText)
		) {
			method = 'min';
		} else if (
			// `height > 50 ? height : 50`
			(isGreaterOrEqual && leftText === consequentText && rightText === alternateText)
			// `height < 50 ? 50 : height`
			|| (isLessOrEqual && leftText === alternateText && rightText === consequentText)
		) {
			method = 'max';
		}

		if (!method) {
			return;
		}

		return {
			node: conditionalExpression,
			messageId: MESSAGE_ID,
			data: {method},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;

				yield * fixSpaceAroundKeyword(fixer, conditionalExpression, sourceCode);

				const argumentsText = [left, right]
					.map(node => node.type === 'SequenceExpression' ? `(${sourceCode.getText(node)})` : sourceCode.getText(node))
					.join(', ');

				yield fixer.replaceText(conditionalExpression, `Math.${method}(${argumentsText})`);
			},
		};
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
