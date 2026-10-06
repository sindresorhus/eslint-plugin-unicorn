import {getParenthesizedText, isParenthesized} from './parentheses/parentheses.js';

/**
Check if parentheses should be added to a `node` when it's used as child of `ConditionalExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToConditionalExpressionChild(node) {
	// Lower precedence, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
	return [
		'AwaitExpression',
		'AssignmentExpression',
		'YieldExpression',
		'SequenceExpression',
		'TSAsExpression',
		'TSTypeAssertion',
	].includes(node.type);
}

/**
Get the text of `node` so it can be used as a child of `ConditionalExpression`, adding parentheses when needed.

Existing parentheses around `node` are kept.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export function getConditionalExpressionChildText(node, context) {
	const text = getParenthesizedText(node, context);
	return !isParenthesized(node, context) && shouldAddParenthesesToConditionalExpressionChild(node) ? `(${text})` : text;
}
