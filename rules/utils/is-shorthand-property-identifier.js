'use strict';

const isShorthandPropertyIdentifier = identifier =>
	identifier.parent.type === 'Property' &&
	identifier.parent.shorthand &&
	identifier === identifier.parent.value;

module.exports = isShorthandPropertyIdentifier;
