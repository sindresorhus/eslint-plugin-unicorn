'use strict';

const memberExpressionSelector = ({path, property, object}) => {
	const prefix = `${path}.`;

	const parts = [
		`[${prefix}type="MemberExpression"]`,
		`[${prefix}computed=false]`,
		`[${prefix}optional!=true]`,
		`[${prefix}property.type="Identifier"]`,
		`[${prefix}property.name="${property}"]`
	];

	if (object) {
		parts.push(
			`[${prefix}object.type="Identifier"]`,
			`[${prefix}object.name="${object}"]`
		);
	}

	return parts.join('');
};

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
		path
	} = {
		path: '',
		...options
	};

	const prefix = path ? `${path}.` : '';

	return [
		memberExpressionSelector({
			path,
			property: name
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

module.exports = arrayPrototypeMethodSelector;
