'use strict';

const isShorthandExportLocal = identifier =>
	identifier.parent.type === 'ExportSpecifier' &&
	identifier.parent.exported === identifier &&
	identifier.parent.local === identifier;

module.exports = isShorthandExportLocal;
