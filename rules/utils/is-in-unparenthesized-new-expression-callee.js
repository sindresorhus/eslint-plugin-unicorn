import {isParenthesized} from './parentheses/parentheses.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
Check whether a node is part of an unparenthesized constructor callee.

A call introduced in an unparenthesized constructor callee would become the constructor's argument list.
*/
export default function isInUnparenthesizedNewExpressionCallee(node, context) {
	while (!isParenthesized(node, context)) {
		const {parent} = node;
		if (parent.type === 'NewExpression' && parent.callee === node) {
			return true;
		}

		if (
			(parent.type === 'MemberExpression' && parent.object === node)
			|| (parent.type === 'TaggedTemplateExpression' && parent.tag === node)
			|| (isTypeScriptExpressionWrapper(parent) && parent.expression === node)
		) {
			node = parent;
			continue;
		}

		break;
	}

	return false;
}
