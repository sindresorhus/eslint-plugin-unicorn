'use strict';

module.exports = options => {
	const {
		name,
		names,
		length,
		object,
		objects,
		min,
		max,
		property = '',
		includeOptional = false,
		allowSpreadElement = false
	} = {
		min: 0,
		max: Number.POSITIVE_INFINITY,
		...options
	};

	const prefix = property ? `${property}.` : '';

	const selector = [
		`[${prefix}type="CallExpression"]`,
		`[${prefix}optional=false]`,
		`[${prefix}callee.type="MemberExpression"]`,
		`[${prefix}callee.optional=false]`,
		`[${prefix}callee.property.type="Identifier"]`
	];

	if (!includeOptional) {
		selector.push(`[${prefix}callee.computed=false]`);
	}

	if (name) {
		selector.push(`[${prefix}callee.property.name="${name}"]`);
	}

	if (Array.isArray(names) && names.length > 0) {
		selector.push(
			':matches(' +
			names.map(name => `[${prefix}callee.property.name="${name}"]`).join(', ') +
			')'
		);
	}

	if (object) {
		selector.push(
			`[${prefix}callee.object.type="Identifier"]`,
			`[${prefix}callee.object.name="${object}"]`
		);
	}

	if (Array.isArray(objects) && objects.length > 0) {
		selector.push(
			`[${prefix}callee.object.type="Identifier"]`,
			':matches(' +
			objects.map(object => `[${prefix}callee.object.name="${object}"]`).join(', ') +
			')'
		);
	}

	if (typeof length === 'number') {
		selector.push(`[${prefix}arguments.length=${length}]`);
	}

	if (min !== 0) {
		selector.push(`[${prefix}arguments.length>=${min}]`);
	}

	if (Number.isFinite(max)) {
		selector.push(`[${prefix}arguments.length<=${max}]`);
	}

	if (!allowSpreadElement) {
		const maxArguments = Number.isFinite(max) ? max : length;
		if (typeof maxArguments === 'number') {
			// Exclude arguments with `SpreadElement` type
			for (let index = 0; index < maxArguments; index += 1) {
				selector.push(`[${prefix}arguments.${index}.type!="SpreadElement"]`);
			}
		}
	}

	return selector.join('');
};
