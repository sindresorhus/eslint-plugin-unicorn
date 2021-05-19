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
	let {
		name,
		names,
		path
	} = {
		path: '',
		...options
	};

	const prefix = path ? `${path}.` : '';
	if (name) {
		names = [name];
	}

	return [
		memberExpressionSelector({
			path,
			properties: names
		}),
		`:matches(${
			[
				emptyArraySelector(`${prefix}object`),
				memberExpressionSelector({
					path: `${prefix}object`,
					property: 'prototype',
					object: 'Array'
				})
			].join(', ')
		})`
	].join('');
}

module.exports = {arrayPrototypeMethodSelector};
