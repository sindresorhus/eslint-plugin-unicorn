'use strict';

function memberExpressionSelector(options) {
	let {
		path,
		property,
		properties,
		object
	} = {
		path: '',
		property: '',
		...options
	};

	const prefix = `${path}.`;
	if (property) {
		properties = [property];
	}

	const parts = [
		`[${prefix}type="MemberExpression"]`,
		`[${prefix}computed=false]`,
		`[${prefix}optional!=true]`,
		`[${prefix}property.type="Identifier"]`
	];

	if (Array.isArray(properties) && properties.length > 0) {
		parts.push(`:matches(${properties.map(property => `[${prefix}property.name="${property}"]`)})`);
	}

	if (object) {
		parts.push(
			`[${prefix}object.type="Identifier"]`,
			`[${prefix}object.name="${object}"]`
		);
	}

	return parts.join('');
}

module.exports = memberExpressionSelector;
