import {isParenthesized} from './parentheses/parentheses.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
Check whether `node` starts an unparenthesized, non-delegated `yield` argument, including through postfix TypeScript wrappers.

Removing its leading token can turn `yield !\nvalue` into a bare `yield` followed by another statement.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isUnparenthesizedYieldArgument(node, context) {
	while (!isParenthesized(node, context)) {
		const {parent} = node;
		if (parent.type === 'YieldExpression') {
			return !parent.delegate && parent.argument === node;
		}

		if (
			!isTypeScriptExpressionWrapper(parent)
			|| context.sourceCode.getRange(parent)[0] !== context.sourceCode.getRange(node)[0]
		) {
			return false;
		}

		node = parent;
	}

	return false;
}
