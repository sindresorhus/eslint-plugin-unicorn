/**
Get the expression a function returns when its body is a single expression: the concise body of an arrow function (`x => value`), or the argument of the only statement when it is a `return` statement (`function () {return value;}`).

Callers check the function itself (for example `async`, `generator`, or the parameters).

@param {import('estree').Function} functionNode
@returns {import('estree').Expression | undefined}
*/
export function getFunctionReturnExpression(functionNode) {
	if (functionNode.body.type !== 'BlockStatement') {
		return functionNode.body;
	}

	const {body} = functionNode.body;
	if (body.length === 1 && body[0].type === 'ReturnStatement') {
		return body[0].argument ?? undefined;
	}
}

/**
Get the only expression a function evaluates: the concise body of an arrow function (`x => value`), or the expression of the only statement when it is an expression statement (`function () {value;}`).

@param {import('estree').Function} functionNode
@returns {import('estree').Expression | undefined}
*/
export function getFunctionOnlyExpression(functionNode) {
	if (functionNode.body.type !== 'BlockStatement') {
		return functionNode.body;
	}

	const {body} = functionNode.body;
	if (body.length === 1 && body[0].type === 'ExpressionStatement') {
		return body[0].expression;
	}
}
