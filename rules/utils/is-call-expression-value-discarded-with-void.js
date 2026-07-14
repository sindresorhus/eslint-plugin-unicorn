/**
Check whether the value of a call expression or its outer call chain is explicitly discarded with `void`.

@param {import('@typescript-eslint/types').TSESTree.CallExpression} callExpression - The call expression to check.
@returns {boolean}
*/
export default function isCallExpressionValueDiscardedWithVoid(callExpression) {
	let expression = callExpression;
	while (
		expression.parent.type === 'MemberExpression'
		&& expression.parent.object === expression
		&& expression.parent.parent.type === 'CallExpression'
		&& expression.parent.parent.callee === expression.parent
	) {
		expression = expression.parent.parent;
	}

	if (expression.parent.type === 'ChainExpression') {
		expression = expression.parent;
	}

	return expression.parent.type === 'UnaryExpression' && expression.parent.operator === 'void';
}
