'use strict';

module.exports = ({parent, name}) =>
	parent.type === 'ExportSpecifier' &&
	parent.exported.name === name &&
	parent.local.name === name;
