import {isParenthesized} from './parentheses/parentheses.js';

/**
Get the `return`, `throw`, or non-delegated `yield` whose unparenthesized argument starts with `node`, including through surrounding expressions.

Removing its leading token can turn `yield !\nvalue` into a bare `yield` followed by another statement.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {import('estree').Node | undefined}
*/
export default function getUnparenthesizedKeywordArgumentParent(node, context) {
	while (!isParenthesized(node, context)) {
		const {parent} = node;
		if (
			parent?.argument === node
			&& (
				parent.type === 'ReturnStatement'
				|| parent.type === 'ThrowStatement'
				|| (parent.type === 'YieldExpression' && !parent.delegate)
			)
		) {
			return parent;
		}

		if (
			!parent
			|| context.sourceCode.getRange(parent)[0] !== context.sourceCode.getRange(node)[0]
		) {
			return;
		}

		node = parent;
	}
}
