'use strict';
const {isValidES3Identifier} = require('@babel/types');
const resolveVariableName = require('./resolve-variable-name.js');

const indexifyName = (name, index) => name + '_'.repeat(index);
const someScopeHasVariableName = (name, scopes) => scopes.some(scope => resolveVariableName(name, scope));

/*
Unresolved reference is probably from the global scope. We should avoid using that name.

For example, like `foo` and `bar` below.

```
function unicorn() {
	return foo;
}

function unicorn() {
	return function() {
		return bar;
	};
}
```
*/
const isUnresolvedName = (name, scopes) => scopes.some(scope =>
	scope.references.some(reference => reference.identifier && reference.identifier.name === name && !reference.resolved) ||
	isUnresolvedName(name, scope.childScopes)
);

const isSafeName = (name, scopes) =>
	!someScopeHasVariableName(name, scopes) &&
	isValidES3Identifier(name) &&
	name !== 'arguments' &&
	!isUnresolvedName(name, scopes);

const alwaysTrue = () => true;

/**
Rule-specific name check function.

@callback isSafe
@param {string} indexifiedName - The generated candidate name.
@param {Scope[]} scopes - The same list of scopes you pass to `avoidCapture`.
@returns {boolean} - `true` if the `indexifiedName` is ok.
*/

/**
Generates a unique name prefixed with `name` such that:
- it is not defined in any of the `scopes`,
- it is not a reserved word,
- it is not `arguments` in strict scopes (where `arguments` is not allowed),
- it does not collide with the actual `arguments` (which is always defined in function scopes).

Useful when you want to rename a variable (or create a new variable) while being sure not to shadow any other variables in the code.

@param {string} name - The desired name for a new variable.
@param {Scope[]} scopes - The list of scopes the new variable will be referenced in.
@param {isSafe} [isSafe] - Rule-specific name check function.
@returns {string} - Either `name` as is, or a string like `${name}_` suffixed with underscores to make the name unique.
*/
module.exports = (name, scopes, isSafe = alwaysTrue) => {
	let index = 0;
let indexifiedName = indexifyName(name, index);
	while (!isSafeName(indexifiedName, scopes) || !isSafe(indexifiedName, scopes)) {
		index++;
		indexifiedName = indexifyName(name, index);

	}

	return indexifiedName;
};
