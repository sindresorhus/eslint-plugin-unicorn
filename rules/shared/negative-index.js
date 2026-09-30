import {
	getParenthesizedRange,
	hasCommentInRange,
} from '../utils/index.js';
import {isLengthOf, unwrapExpression} from '../utils/comparison.js';
import {isNumericLiteral} from '../ast/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

// `slice(length - n)` and `slice(-n)` only agree for a whole number of elements
const isLiteralPositiveNumber = node =>
	isNumericLiteral(node)
	&& node.value > 0
	&& Number.isSafeInteger(node.value);

export function getNegativeIndexLengthNode(node, objectNode) {
	if (!node) {
		return;
	}

	node = unwrapExpression(node);

	const {type, operator, left, right} = node;

	if (type !== 'BinaryExpression' || operator !== '-') {
		return;
	}

	const rightExpression = unwrapExpression(right);

	if (!isLiteralPositiveNumber(rightExpression)) {
		return;
	}

	if (isLengthOf(left, objectNode)) {
		return left;
	}

	// Nested BinaryExpression
	return getNegativeIndexLengthNode(left, objectNode);
}

/**
@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export function removeLengthNode(node, fixer, context) {
	const [start, end] = getParenthesizedRange(node, context);

	// The whole `.length` access and its parentheses are removed, so a comment inside them would be lost.
	if (hasCommentInRange(context, [start, end])) {
		return;
	}

	return fixer.removeRange([
		start,
		end + context.sourceCode.text.slice(end).match(/\S|$/).index,
	]);
}
