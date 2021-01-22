'use strict';

module.exports = ({parent, name}) =>
	parent.type === 'ImportSpecifier' &&
	parent.imported.name === name &&
	parent.local.name === name;
