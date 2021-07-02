'use strict';
const {methodCallSelector, matches, memberExpressionSelector} = require('./selectors/index.js');
const isSameReference = require('./utils/is-same-reference.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {
	removeSpacesAfter,
	replaceNodeOrTokenAndSpacesBefore
} = require('./fix/index.js');

const messages = {
	'some': '`Array#some()` returns `false` on empty array, the empty check is not needed.',
	'every': '`Array#every()` returns `true` on empty array, the non-empty check is not needed.',
};

const logicalExpressionSelector = [
	'LogicalExpression',
	matches(['[operator="||"]', '[operator="&&"]'])
].join('');
// We assume the user already follows `unicorn/explicit-length-check`, these are allowed in that rule
const lengthCompareZeroSelector = [
	logicalExpressionSelector,
	' > ',
	'BinaryExpression',
	memberExpressionSelector({path: 'left', name: 'length'}),
	'[right.type="Literal"]',
	'[right.raw="0"]',
].join('');
const zeroLengthCheckSelector = [
	lengthCompareZeroSelector,
	'[operator="==="]'
].join('');
const nonZeroLengthCheckSelector = [
	lengthCompareZeroSelector,
	matches(['[operator=">"]', '[operator="!=="]']),
].join('');
const arraySomeCallSelector = methodCallSelector('some');
const arrayEveryCallSelector = methodCallSelector('every');

function flatLogicalExpression(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === node.operator ?
			flatLogicalExpression(child) :
			[child]
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const logicalExpressions = new Set();
	const zeroLengthChecks = new Set();
	const nonZeroLengthChecks = new Set();
	const arraySomeCalls = new Set();
	const arrayEveryCalls = new Set();
	const reported = new Set();

	function getProblem({node, operator, method, operatorOnLeft}) {
		reported.add(node);

		return {
			loc: {
				start: node.left.property.loc.start,
				end: node.left.loc.end,
			},
			messageId: method,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const sourceCode = context.getSourceCode();
				yield fixer.removeRange(getParenthesizedRange(node, sourceCode))

				const operatorToken = sourceCode[operatorOnLeft ? 'getTokenBefore' : 'getTokenAfter'](
					node,
					token => token.type === 'Punctuator' && token.value === operator
				);

				if (operatorOnLeft) {
					yield * replaceNodeOrTokenAndSpacesBefore(operatorToken, '', fixer, sourceCode);
				} else {
					yield fixer.remove(operatorToken);
					yield removeSpacesAfter(operatorToken, sourceCode, fixer);
				}
			}
		};
	}

	function checkLengthCheckNode({node, logicalExpression, previewNode, nextNode}) {
		if (reported.has(node)) {
			return;
		}

		const {operator} = logicalExpression;
		if (
			(operator === '||' && !zeroLengthChecks.has(node)) ||
			(operator === '&&' && !nonZeroLengthChecks.has(node))
		) {
			return;
		}

		for (const [index, callExpression] of [previewNode, nextNode].entries()) {
			if (
				callExpression &&
				(
					(operator === '||' && arrayEveryCalls.has(callExpression)) ||
					(operator === '&&' && arraySomeCalls.has(callExpression))
				) &&
				isSameReference(node.left.object, callExpression.callee.object)
			) {
				return getProblem({
					node,
					operator,
					method: callExpression.callee.property.name,
					operatorOnLeft: index === 0
				});
			}
		}
	}

	function * checkLogicalExpression(logicalExpression) {
		const conditions = flatLogicalExpression(logicalExpression);

		for (const [index, node] of conditions.entries()) {
			yield checkLengthCheckNode({
				node,
				logicalExpression,
				previewNode: conditions[index - 1],
				nextNode: conditions[index + 1]
			});
		}
	}

	return {
		[logicalExpressionSelector](node) {
			logicalExpressions.add(node);
		},
		[zeroLengthCheckSelector](node) {
			zeroLengthChecks.add(node);
		},
		[nonZeroLengthCheckSelector](node) {
			nonZeroLengthChecks.add(node);
		},
		[arraySomeCallSelector](node) {
			arraySomeCalls.add(node);
		},
		[arrayEveryCallSelector](node) {
			arrayEveryCalls.add(node);
		},
		* 'Program:exit'() {
			for (const logicalExpression of logicalExpressions) {
				yield * checkLogicalExpression(logicalExpression);
			}
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
