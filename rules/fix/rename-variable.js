'use strict';
const getVariableIdentifiers = require('../utils/get-variable-identifiers.js');
const replaceReferenceIdentifier = require('./replace-reference-identifier.js');

/**
Incrementing a variable

@param {string} variableName
@returns {string}
*/
function incrementVariableName(variableName) {
	const match = variableName.match(/(\d+)$/);

	if (match) {
		const number = Number.parseInt(match[1], 10);
		return variableName.replace(/\d+$/, number + 1);
	}

	return `${variableName}2`;
}

/**
Get a variable name that does not conflict with existing variables in the scope.

@param {import('eslint').Scope.Scope} scope
@param {string} variableName
@param {Array<import('estree').Identifier>} ignores
@returns {string}
*/
function getNonConflictingVariableName(scope, variableName, ignores) {
	for (const variable of scope.variables) {
		// Skip ignored variables
		if (variable.defs.some(definition => ignores.includes(definition.node))) {
			continue;
		}

		if (variable.name === variableName) {
			return getNonConflictingVariableName(scope, incrementVariableName(variableName), ignores);
		}
	}

	return variableName;
}

const renameVariable = (variable, name, fixer) =>
	getVariableIdentifiers(variable)
		.map(identifier => {
			const nonConflictingName = getNonConflictingVariableName(variable.scope, name, [identifier]);

			return replaceReferenceIdentifier(identifier, nonConflictingName, fixer);
		});

module.exports = renameVariable;
