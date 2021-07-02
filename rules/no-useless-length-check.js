'use strict';
const {methodCallSelector, matches, memberExpressionSelector} = require('./selectors/index.js');
const isSameReference = require('./utils/is-same-reference.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {
	removeSpacesAfter,
	replaceNodeOrTokenAndSpacesBefore
} = require('./fix/index.js');

const messages = {
	'non-zero': '`Array#some()` returns `false` on empty array, the empty check is not needed.',
	'zero': '`Array#every()` returns `true` on empty array, the non-empty check is not needed.',
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

	function getProblem(node, nodeShouldBeRemoved) {
		return {
			loc: {
				start: node.left.property.loc.start,
				end: node.left.loc.end,
			},
			messageId: zeroLengthChecks.has(node) ? 'zero' : 'non-zero',
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix(fixer) {
				const sourceCode = context.getSourceCode();
				const {parent} = node;
				const leftRange = getParenthesizedRange(parent.left, sourceCode);
				const rightRange = getParenthesizedRange(parent.right, sourceCode);
				let range = [];
				if (parent.left === node) {
					range[0] = leftRange[0];
					range[1] = rightRange[0];
				} else {
					range[0] = leftRange[1];
					range[1] = rightRange[1];
				}

				return fixer.removeRange(range)
			}
		};
	}

	function isUselessLengthCheckNode({node, logicalExpression, previewNode, nextNode}) {
		const {operator} = logicalExpression;
		if (
			(operator === '||' && !zeroLengthChecks.has(node)) ||
			(operator === '&&' && !nonZeroLengthChecks.has(node))
		) {
			return false;
		}

		return [previewNode, nextNode].some(
			callExpression =>
				callExpression &&
				(
					(operator === '||' && arrayEveryCalls.has(callExpression)) ||
					(operator === '&&' && arraySomeCalls.has(callExpression))
				) &&
				isSameReference(node.left.object, callExpression.callee.object)
		);
	}

	function getUselessLengthCheckNode(logicalExpression) {
		return flatLogicalExpression(logicalExpression)
			.filter((node, index, conditions) => isUselessLengthCheckNode({
				node,
				logicalExpression,
				previewNode: conditions[index - 1],
				nextNode: conditions[index + 1]
			}))
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
			let nodeShouldBeRemoved = new Set();
			for (const logicalExpression of logicalExpressions) {
				for (const node of getUselessLengthCheckNode(logicalExpression)) {
					nodeShouldBeRemoved.add(node);
				}
			}

			for (const node of nodeShouldBeRemoved) {
				yield getProblem(node, nodeShouldBeRemoved);
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
