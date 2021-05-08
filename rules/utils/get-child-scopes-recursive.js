'use strict';

/**
Gather a list of all Scopes starting recursively from the input Scope.

@param {Scope} scope - The Scope to start checking from.
@returns {Scope[]} - The resulting Scopes.
*/
const getChildScopesRecursive = scope => [
	scope,
	...scope.childScopes.flatMap(scope => getChildScopesRecursive(scope))
];

module.exports = getChildScopesRecursive;
