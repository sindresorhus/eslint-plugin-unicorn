'use strict';
const {
  isIdentifierName,
  isStrictReservedWord,
  isKeyword,
}= require("@babel/helper-validator-identifier");
const resolveVariableName = require('./resolve-variable-name.js');

// Copied from https://github.com/babel/babel/blob/fce35af69101c6b316557e28abf60bdbf77d6a36/packages/babel-types/src/validators/isValidIdentifier.ts#L7
// Use this function instead of `require('@babel/types').isIdentifier`, since `@babel/helper-validator-identifier` is much smaller
const isValidIdentifier = name =>
	typeof name === 'string' &&
	!isKeyword(name) &&
	!isStrictReservedWord(name, true) &&
	isIdentifierName(name);

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
const isUnresolvedName = (name, scope) =>
	scope.references.some(reference => reference.identifier && reference.identifier.name === name && !reference.resolved) ||
	scope.childScopes.some(scope => isUnresolvedName(name, scope));

const isSafeName = (name, scopes) =>
	name !== 'arguments' &&
	!scopes.some(scope => resolveVariableName(name, scope) || isUnresolvedName(name, scope));

const alwaysTrue = () => true;

/**
Rule-specific name check function.

@callback isSafe
@param {string} name - The generated candidate name.
@param {Scope[]} scopes - The same list of scopes you pass to `avoidCapture`.
@returns {boolean} - `true` if the `name` is ok.
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
	if (!isValidIdentifier(name)) {
		name += '_';

		if (!isValidIdentifier(name)) {
			return;
		}
	}


	while (!isSafeName(name, scopes) || !isSafe(name, scopes)) {
		name += '_';
	}

	return name;
};
