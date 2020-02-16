'use strict';

module.exports = options => {
	const {
		name,
		names,
		length,
		object,
		min,
		max
	} = {
		min: 0,
		max: Infinity,
		...options
	};

	const selector = [
		'CallExpression',
		'[callee.type="MemberExpression"]',
		'[callee.computed=false]',
		'[callee.property.type="Identifier"]'
	];

	if (name) {
		selector.push(`[callee.property.name="${name}"]`);
	}

	if (Array.isArray(names) && names.length !== 0) {
		selector.push(
			':matches(' +
			names.map(name => `[callee.property.name="${name}"]`).join(', ') +
			')'
		);
	}

	if (object) {
		selector.push('[callee.object.type="Identifier"]');
		selector.push(`[callee.object.name="${object}"]`);
	}

	if (typeof length === 'number') {
		selector.push(`[arguments.length=${length}]`);
	}

	if (min !== 0) {
		selector.push(`[arguments.length>=${min}]`);
	}

	if (Number.isFinite(max)) {
		selector.push(`[arguments.length<=${max}]`);
	}

	const maxArguments = Number.isFinite(max) ? max : length;
	if (typeof maxArguments === 'number') {
		// Exclude arguments with `SpreadElement` type
		for (let index = 0; index < maxArguments; index += 1) {
			selector.push(`[arguments.${index}.type!="SpreadElement"]`);
		}
	}

	return selector.join('');
};
