'use strict';
const {methodCallSelector, matches, memberExpressionSelector} = require('./selectors/index.js');
const isSameReference = require('./utils/is-same-reference.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');

const messages = {
	'some': '`Array#some()` returns `false` on empty array, the empty check is not needed.',
	'every': '`Array#every()` returns `true` on empty array, the non-empty check is not needed.',
};

const selector = [
	'LogicalExpression',
	'[left.type="BinaryExpression"]',
	memberExpressionSelector({path: 'left.left', name: 'length'}),
	'[left.right.type="Literal"]',
	'[left.right.raw="0"]',
	methodCallSelector({path: 'right'}),
	matches([
		[
			'[operator="||"]',
			'[left.operator="==="]',
			'[right.callee.property.name="every"]'
		].join(''),
		[
			'[operator="&&"]',
			// We assume user already follows `unicorn/explicit-length-check`, these are allowed in that rule
			matches(['[left.operator=">"]', '[left.operator="!=="]']),
			'[right.callee.property.name="some"]'
		].join(''),
	])
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](logicalExpression) {
			const {left, right} = logicalExpression;
			const lengthArray = left.left.object;
			const methodArray = right.callee.object;

			if (!isSameReference(lengthArray, methodArray)) {
				return;
			}

			const method = right.callee.property.name;

			return {
				loc: {
					start: left.left.property.loc.start,
					end: left.loc.end,
				},
				messageId: method,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix(fixer) {
					const sourceCode = context.getSourceCode();
					const [start] = getParenthesizedRange(left, sourceCode);
					const [end] = getParenthesizedRange(right, sourceCode);

					return fixer.removeRange([start, end])
				}
			};
		}
	}
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless array length check.'
		},
		fixable: 'code',
		messages
	}
};
