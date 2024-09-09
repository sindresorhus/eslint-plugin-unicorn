'use strict';

/**
Determines whether a node is a Global Identifier.

@param {import('estree').Identifier} identifier
@param {import('eslint').SourceCode} sourceCode
*/
function isGlobalIdentifier(identifier, sourceCode) {
	const scope = sourceCode.getScope(identifier);

	return scope.type === 'global' || scope.type === 'module';
}

module.exports = isGlobalIdentifier;
