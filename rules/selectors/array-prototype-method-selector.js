'use strict';
const matches = require('./matches-any');
const memberExpressionSelector = require('./member-expression-selector');
const emptyArraySelector = require('./empty-array-selector');

// `[].method` or `Array.prototype.method`
function arrayPrototypeMethodSelector(options) {
	const {
		name,
		names,
		path
	} = {
		path: '',
		name: '',
		...options
	};

	const objectPath = path ? `${path}.object` : 'object';

	return [
		memberExpressionSelector({
			path,
			name,
			names
		}),
		matches([
			emptyArraySelector(objectPath),
			memberExpressionSelector({path: objectPath, name: 'prototype', object: 'Array'})
		])
	].join('');
}

module.exports = arrayPrototypeMethodSelector;
