import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
Check whether the value of a call expression or its outer call chain is explicitly discarded with `void`.

@param {import('@typescript-eslint/types').TSESTree.CallExpression} callExpression - The call expression to check.
@returns {boolean}
*/
export default function isCallExpressionValueDiscardedWithVoid(callExpression) {
	let expression = callExpression;
	while (true) {
		const {parent} = expression;
		if (
			parent.type === 'MemberExpression'
			&& parent.object === expression
			&& parent.parent.type === 'CallExpression'
			&& parent.parent.callee === parent
		) {
			expression = parent.parent;
			continue;
		}

		if (
			(parent.type === 'ChainExpression' || isTypeScriptExpressionWrapper(parent))
			&& parent.expression === expression
		) {
			expression = parent;
			continue;
		}

		return parent.type === 'UnaryExpression' && parent.operator === 'void';
	}
}
