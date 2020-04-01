'use strict';
const getVariableIdentifiers = require('./get-variable-identifiers');
const renameIdentifier = require('./rename-identifier');

module.exports = (variable, name, fixer, sourceCode) =>
	getVariableIdentifiers(variable)
		.map(identifier => renameIdentifier(identifier, name, fixer, sourceCode));
