/**
Check whether a variable is referenced inside a function, other than the one that declares it, that can run during a loop.

Such a function can run while the variable is still being filled, for example a helper called during the loop. Converting the loop into an initializer moves that read to before the variable is initialized. Only a function created before the end of the loop, or a hoisted function declaration, can run during the loop. A function created after the loop cannot.

@param {import('eslint').Scope.Variable} variable
@param {import('estree').Node} loop
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isReferencedByNestedFunction(variable, loop, context) {
	const {sourceCode} = context;
	const [, loopEnd] = sourceCode.getRange(loop);
	return variable.references.some(reference => {
		const scope = reference.from.variableScope;
		return scope !== variable.scope.variableScope
			&& (
				sourceCode.getRange(reference.identifier)[0] < loopEnd
				|| scope.block.type === 'FunctionDeclaration'
			);
	});
}
