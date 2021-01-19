'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'AssignmentPattern' &&
	identifier.parent.left === identifier &&
	identifier.parent.parent.type === 'Property' &&
	(
		identifier === identifier.parent.parent.key ||
		// In `babel-eslint` parent.key is not reference of identifier, #444
		// issue https://github.com/babel/babel-eslint/issues/809
		hasSameRange(identifier, identifier.parent.parent.key)
	) &&
	identifier.parent.parent.value === identifier.parent &&
	identifier.parent.parent.shorthand;
