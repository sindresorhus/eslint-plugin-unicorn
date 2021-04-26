'use strict';

const hasSameRange = require('./has-same-range');

module.exports = identifier =>
	identifier.parent.type === 'AssignmentPattern' &&
	identifier.parent.left === identifier &&
	identifier.parent.parent.type === 'Property' &&
	(
		identifier === identifier.parent.parent.key ||
		// TODO: Report this to `@babel/eslint-parser`
		// Original issue on `babel-eslint` https://github.com/babel/babel-eslint/issues/809
		hasSameRange(identifier, identifier.parent.parent.key)
	) &&
	identifier.parent.parent.value === identifier.parent &&
	identifier.parent.parent.shorthand;
