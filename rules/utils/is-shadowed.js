'use strict';

const findReference = require('./find-reference.js');

/**
 * Checks if the given identifier node is shadowed in the given scope.
 * @param {Object} scope The current scope.
 * @param {string} node The identifier node to check
 * @returns {boolean} Whether or not the name is shadowed.
 */
function isShadowed(scope, node) {
	const reference = findReference(scope, node);

	return (
		reference
		&& reference.resolved
		&& reference.resolved.defs.length > 0
	);
}

module.exports = isShadowed;
