'use strict';

const isShorthandImportIdentifier = identifier =>
	identifier.parent.type === 'ImportSpecifier' &&
	identifier.parent.imported === identifier &&
	identifier.parent.local === identifier;

module.exports = isShorthandImportIdentifier;
