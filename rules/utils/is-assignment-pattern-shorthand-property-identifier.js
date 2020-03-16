'use strict';

const isSameNode = require('./is-same-node');

module.exports = identifier =>
	identifier.parent.type === 'AssignmentPattern' &&
	identifier.parent.left === identifier &&
	identifier.parent.parent.type === 'Property' &&
	isSameNode(identifier, identifier.parent.parent.key) &&
	identifier.parent.parent.value === identifier.parent &&
	identifier.parent.parent.shorthand;
