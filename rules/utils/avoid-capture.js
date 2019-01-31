'use strict';
const resolveVariableName = require('./resolve-variable-name');

const indexifyName = (name, index) => index === 1 ? name : name + index;

const someScopeHasVariableName = (name, scopes) => scopes.some(scope => resolveVariableName(name, scope));

module.exports = (name, scopes) => {
	let index = 1;
	while (someScopeHasVariableName(indexifyName(name, index), scopes)) {
		index++;
	}

	return indexifyName(name, index);
};
