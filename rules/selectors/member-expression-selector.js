'use strict';
const matches = require('./matches-any.js');

function memberExpressionSelector(options) {
	if (typeof options === 'string') {
		options = {names: [options]};
	}

	if (Array.isArray(options)) {
		options = {names: options};
	}

	let {
		path,
		name,
		names,
		object,
		objects,
		includeOptional,
		allowComputed
	} = {
		path: '',
		name: '',
		object: '',
		includeOptional: false,
		allowComputed: false,
		...options
	};

	const prefix = path ? `${path}.` : '';
	if (name) {
		names = [name];
	}

	if (object) {
		objects = [object];
	}

	const parts = [
		`[${prefix}type="MemberExpression"]`
	];

	if (!allowComputed) {
		parts.push(
			`[${prefix}computed!=true]`,
			`[${prefix}property.type="Identifier"]`
		);
	}

	if (!includeOptional) {
		parts.push(`[${prefix}optional!=true]`);
	}

	if (Array.isArray(names) && names.length > 0) {
		parts.push(matches(names.map(property => `[${prefix}property.name="${property}"]`)));
	}

	if (Array.isArray(objects) && objects.length > 0) {
		parts.push(
			`[${prefix}object.type="Identifier"]`,
			matches(objects.map(object => `[${prefix}object.name="${object}"]`))
		);
	}

	return parts.join('');
}

module.exports = memberExpressionSelector;
