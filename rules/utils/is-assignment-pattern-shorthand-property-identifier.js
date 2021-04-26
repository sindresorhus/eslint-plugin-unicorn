'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'AssignmentPattern' &&
	identifier.parent.left === identifier &&
	identifier.parent.parent.type === 'Property' &&
	(
		identifier === identifier.parent.parent.key ||
		// In `@babel/eslint-parser` the `variable.reference.identifier`
		// is neither reference of `identifier.parent.key` nor `identifier.parent.value`
		// https://github.com/babel/babel/issues/13205
		hasSameRange(identifier, identifier.parent.parent.key)
	) &&
	identifier.parent.parent.value === identifier.parent &&
	identifier.parent.parent.shorthand;
