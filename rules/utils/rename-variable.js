'use strict';
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const renameIdentifier = require('./utils/rename-identifier');

module.exports = (variable, name, fixer, sourceCode) =>
	getVariableIdentifiers(variable)
		.map(identifier => renameIdentifier(identifier, name, fixer, sourceCode));
