'use strict';

// Get identifiers of given variable
const getVariableIdentifiers = ({identifiers, references}) => [...new Set([
	...identifiers,
	...references.map(({identifier}) => identifier),
])];
module.exports = getVariableIdentifiers;
