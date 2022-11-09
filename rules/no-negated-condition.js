/*
Based on ESLint builtin `no-negated-condition` rule
https://github.com/eslint/eslint/blob/5c39425fc55ecc0b97bbd07ac22654c0eb4f789c/lib/rules/no-negated-condition.js
*/
'use strict';
const {matches} = require('./selectors/index.js');
const { removeParentheses } = require('./fix/index.js');
const { getParenthesizedRange, getParenthesizedText } = require('./utils/parentheses.js');

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

function * convertNegatedCondition(fixer, node, sourceCode) {
	const {test} = node;
	if (test.type === 'UnaryExpression') {
		const token = sourceCode.getFirstToken(test);
		yield * removeParentheses(test, fixer, sourceCode);
		yield fixer.remove(token);
		return;
	}

	const token = sourceCode.getTokenAfter(
		test.left,
		token => token.type === "Punctuator" && token.value === test.operator,
	);

	yield fixer.replaceText(token, '=' + token.value.slice(1));
}

function * swapConsequentAndAlternate(fixer, node, sourceCode) {
	const [consequent, alternate] = [
		node.consequent,
		node.alternate
	].map(node => {
		const range = getParenthesizedRange(node, sourceCode);
		return {
			range,
			text: sourceCode.text.slice(...range),
		}
	});

	if (consequent.text === alternate.text) {
		return;
	}

	yield fixer.replaceTextRange(consequent.range, alternate.text);
	yield fixer.replaceTextRange(alternate.range, consequent.text);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			return {
				node: node.test,
				messageId: MESSAGE_ID,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				* fix(fixer) {
					const sourceCode = context.getSourceCode();
					yield * convertNegatedCondition(fixer, node, sourceCode);
					yield * swapConsequentAndAlternate(fixer, node, sourceCode);

					// TODO: Handle edge cases: ASI, space, return argument, parentheses
				}

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
