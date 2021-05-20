'use strict';

function emptyArraySelector(path) {
	const prefix = `${path}.`;
	return [
		`[${prefix}type="ArrayExpression"]`,
		`[${prefix}elements.length=0]`
	].join('');
}

module.exports = emptyArraySelector;
