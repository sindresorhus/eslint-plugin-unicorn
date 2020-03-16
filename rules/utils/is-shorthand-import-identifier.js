'use strict';

const isSameNode = require('./is-same-node');

module.exports = identifier =>
	identifier.parent.type === 'ImportSpecifier' &&
	identifier.parent.imported.name === identifier.name &&
	identifier.parent.local.name === identifier.name
