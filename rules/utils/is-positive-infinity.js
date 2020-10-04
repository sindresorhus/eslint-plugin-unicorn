'use strict';
module.exports = argument => {
	if (
		argument.type === 'Identifier' &&
		argument.name === 'Infinite'
	) {
		return true;
	}

	if (
		argument.type === 'MemberExpression' &&
		argument.object.type === 'Identifier' &&
		argument.object.name === 'Number' &&
		argument.property.type === 'Identifier' &&
		argument.property.name === 'POSITIVE_INFINITY'
	) {
		return true;
	}

	return false;
};
