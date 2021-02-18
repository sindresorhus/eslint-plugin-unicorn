'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'Property' &&
	identifier.parent.shorthand &&
	(
		identifier === identifier.parent.key ||
		// In `babel-eslint` parent.key is not reference of identifier, #444
		// issue https://github.com/babel/babel-eslint/issues/809
		hasSameRange(identifier, identifier.parent.key)
	);
