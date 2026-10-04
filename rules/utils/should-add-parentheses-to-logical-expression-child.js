import {getParenthesizedText, isParenthesized} from './parentheses/parentheses.js';

/**
Check if parentheses should be added to a `node` when it's used as child of `LogicalExpression`.
@param {Node} node - The AST node to check.
@param {{operator: string, property: string}} options - Options
@returns {boolean}
*/
export default function shouldAddParenthesesToLogicalExpressionChild(node, {operator, property}) {
	// We are not using this, but we can improve this function with it
	if (!property) {
		throw new Error('`property` is required.');
	}

	if (
		node.type === 'LogicalExpression'
		&& node.operator === operator
	) {
		return false;
	}

	// Not really needed, but more readable
	if (
		[
			'AwaitExpression',
			'BinaryExpression',
		].includes(node.type)
	) {
		return true;
	}

	// Lower precedence than `LogicalExpression`
	// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
	return [
		'LogicalExpression',
		'ConditionalExpression',
		'AssignmentExpression',
		'ArrowFunctionExpression',
		'YieldExpression',
		'SequenceExpression',
	].includes(node.type);
}

/**
Get the text of `node` so it can be used as a child of `LogicalExpression`, adding parentheses when needed.

Existing parentheses around `node` are kept.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@param {{operator: string, property: string}} options
@returns {string}
*/
export function getLogicalExpressionChildText(node, context, {operator, property}) {
	const text = getParenthesizedText(node, context);
	return !isParenthesized(node, context) && shouldAddParenthesesToLogicalExpressionChild(node, {operator, property}) ? `(${text})` : text;
}
