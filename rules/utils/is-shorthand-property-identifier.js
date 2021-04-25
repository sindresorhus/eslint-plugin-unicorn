'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'Property' &&
	identifier.parent.shorthand &&
	(
		identifier === identifier.parent.key ||
		// TODO: Report this to `@babel/eslint-parser`
		// Original issue on `babel-eslint` https://github.com/babel/babel-eslint/issues/809
		hasSameRange(identifier, identifier.parent.key)
	);
