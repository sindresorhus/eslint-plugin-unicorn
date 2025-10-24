import isSameReference from '../utils/is-same-reference.js';
import {getParenthesizedRange} from '../utils/parentheses.js';
import {isNumericLiteral} from '../ast/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const isLengthMemberExpression = node =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& !node.optional
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length';

const isLiteralPositiveNumber = node =>
	isNumericLiteral(node)
	&& node.value > 0;

export function getNegativeIndexLengthNode(node, objectNode) {
	if (!node) {
		return;
	}

	const {type, operator, left, right} = node;

	if (type !== 'BinaryExpression' || operator !== '-' || !isLiteralPositiveNumber(right)) {
		return;
	}

	if (isLengthMemberExpression(left) && isSameReference(left.object, objectNode)) {
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
	return fixer.removeRange([
		start,
		end + context.sourceCode.text.slice(end).match(/\S|$/).index,
	]);
}

