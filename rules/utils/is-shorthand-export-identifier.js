'use strict';

module.exports = identifier =>
	identifier.parent.type === 'ExportSpecifier' &&
	identifier.parent.exported.name === identifier.name &&
	identifier.parent.local.name === identifier.name;
