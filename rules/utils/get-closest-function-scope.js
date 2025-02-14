/**
Get the closest non-arrow function scope.

@param {import('eslint').Scope.Scope} scope
@return {import('eslint').Scope.Scope | undefined}
*/
const getClosestFunctionScope = scope => {
	while (scope) {
		if (scope.type === 'class') {
			return;
		}

		if (scope.type === 'function' && scope.block.type !== 'ArrowFunctionExpression') {
			return scope;
		}

		scope = scope.upper;
	}
};

export default getClosestFunctionScope;
