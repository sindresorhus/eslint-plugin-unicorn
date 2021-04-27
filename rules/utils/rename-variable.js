'use strict';
const getVariableIdentifiers = require('./get-variable-identifiers');
const replaceReferenceIdentifier = require('./replace-reference-identifier');
const renameVariable = (variable, name, fixer) =>
	getVariableIdentifiers(variable)
		.map(identifier => replaceReferenceIdentifier(identifier, name, fixer));

module.exports = renameVariable;
