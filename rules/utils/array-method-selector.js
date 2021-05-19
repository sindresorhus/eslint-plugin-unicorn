'use strict';
const memberExpressionSelector = require('./member-expression-selector');

const emptyArraySelector = path => {
	const prefix = `${path}.`;
	return [
		`[${prefix}type="ArrayExpression"]`,
		`[${prefix}elements.length=0]`
	].join('');
};

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

	const prefix = path ? `${path}.` : '';

	return [
		memberExpressionSelector({
			path,
			name,
			names
		}),
		`:matches(${
			[
				emptyArraySelector(`${prefix}object`),
				memberExpressionSelector({
					path: `${prefix}object`,
					name: 'prototype',
					object: 'Array'
				})
			].join(', ')
		})`
	].join('');
}

module.exports = {arrayPrototypeMethodSelector, emptyArraySelector};
