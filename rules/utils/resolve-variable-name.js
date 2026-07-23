/**
Finds a variable named `name` in the scope `scope` (or its parents).

@param {string} name - The variable name to resolve.
@param {import('eslint').Scope.Scope} scope - The scope to look for the variable in.
@returns {import('eslint').Scope.Variable | void} - The found variable, if any.
*/
export default function resolveVariableName(name, scope) {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
}
