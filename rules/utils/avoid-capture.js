'use strict';
const resolveVariableName = require('./resolve-variable-name');

const indexifyName = (name, index) => index === 1 ? name : name + index;

const someScopeHasVariableName = (name, scopes) => scopes.some(scope => resolveVariableName(name, scope));

/**
 * Generates a unique name prefixed with `name` such that it is not defined in any of the `scopes`.
 * Useful when you want to rename a variable (or create a new variable)
 * while being sure not to shadow any other variables in the code.
 *
 * @param {string} name - The desired name for a new variable
 * @param {Scope[]} scopes - The list of scopes the new variable will be referenced in
 * @returns {string} - Either `name` as is, or a string like `${name}1` suffixed with a number to make the name unique
 */
module.exports = (name, scopes) => {
	let index = 1;
	while (someScopeHasVariableName(indexifyName(name, index), scopes)) {
		index++;
	}

	return indexifyName(name, index);
};
