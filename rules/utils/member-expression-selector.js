'use strict';

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
		includeOptional
	} = {
		path: '',
		property: '',
		object: '',
		includeOptional: false,
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
		`[${prefix}type="MemberExpression"]`,
		`[${prefix}computed=false]`,
		`[${prefix}property.type="Identifier"]`
	];

	if (!includeOptional) {
		parts.push(`[${prefix}optional!=true]`);
	}

	if (Array.isArray(names) && names.length > 0) {
		parts.push(`:matches(${
			names.map(property => `[${prefix}property.name="${property}"]`).join(', ')
		})`);
	}

	if (Array.isArray(objects) && objects.length > 0) {
		parts.push(
			`[${prefix}object.type="Identifier"]`,
			`:matches(${
				objects.map(object => `[${prefix}object.name="${object}"]`).join(', ')
			})`
		);
	}

	return parts.join('');
}

module.exports = memberExpressionSelector;
