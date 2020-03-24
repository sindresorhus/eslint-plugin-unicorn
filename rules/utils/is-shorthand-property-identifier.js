'use strict';

const isSameNode = require('./is-same-node');

module.exports = identifier =>
	identifier.parent.type === 'Property' &&
	identifier.parent.shorthand &&
	isSameNode(identifier, identifier.parent.key);
