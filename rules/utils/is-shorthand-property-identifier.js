'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'Property' &&
	identifier.parent.shorthand &&
	(
		identifier === identifier.parent.key ||
		// In `@babel/eslint-parser` the `variable.reference.identifier`
		// is neither reference of `identifier.parent.key` nor `identifier.parent.value`
		// https://github.com/babel/babel/issues/13205
		hasSameRange(identifier, identifier.parent.key)
	);
