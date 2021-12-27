'use strict';

/**
 * Finds the eslint-scope reference in the given scope.
 * @param {Object} scope The scope to search.
 * @param {ASTNode} node The identifier node.
 * @returns {Reference|undefined} Returns the found reference or null if none were found.
 */
function findReference(scope, node) {
	const references = scope.references
		.filter(reference => reference.identifier === node);

	if (references.length === 1) {
		return references[0];
	}
}

module.exports = findReference;
