'use strict';
const reservedWords = require('reserved-words');

const resolveVariableName = require('./resolve-variable-name');

const indexifyName = (name, index) => name + '_'.repeat(index);

const someScopeHasVariableName = (name, scopes) => scopes.some(scope => resolveVariableName(name, scope));

const someScopeIsStrict = scopes => scopes.some(scope => scope.isStrict);

const isSafeName = (name, scopes, ecmaVersion, isStrict) => {
	ecmaVersion = Math.min(6, ecmaVersion); // 6 is the latest version understood by `reservedWords`

	return !someScopeHasVariableName(name, scopes) &&
		!reservedWords.check(name, ecmaVersion, isStrict);
};

/**
 * Generates a unique name prefixed with `name` such that:
 * * it is not defined in any of the `scopes`,
 * * it is not a reserved word.
 *
 * Useful when you want to rename a variable (or create a new variable)
 * while being sure not to shadow any other variables in the code.
 *
 * @param {string} name - The desired name for a new variable
 * @param {Scope[]} scopes - The list of scopes the new variable will be referenced in
 * @param {number} ecmaVersion - The language version, get it from `context.parserOptions.ecmaVersion`
 * @returns {string} - Either `name` as is, or a string like `${name}_` suffixed with undescores to make the name unique
 */
module.exports = (name, scopes, ecmaVersion) => {
	const isStrict = someScopeIsStrict(scopes);

	let index = 0;
	while (!isSafeName(indexifyName(name, index), scopes, ecmaVersion, isStrict)) {
		index++;
	}

	return indexifyName(name, index);
};
