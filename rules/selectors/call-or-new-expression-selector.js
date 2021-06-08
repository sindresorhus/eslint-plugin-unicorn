'use strict';

const matches = require('./matches-any.js');

function create(options, types) {
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
		length,
		min,
		max,
		includeOptional,
		allowSpreadElement
	} = {
		path: '',
		min: 0,
		max: Number.POSITIVE_INFINITY,
		includeOptional: false,
		allowSpreadElement: false,
		...options
	};

	const prefix = path ? `${path}.` : '';
	if (name) {
		names = [name];
	}

	const parts = [
		matches(types.map(type => `[${prefix}type="${type}"]`))
	];

	if (!includeOptional) {
		parts.push(`[${prefix}optional!=true]`);
	}

	if (typeof length === 'number') {
		parts.push(`[${prefix}arguments.length=${length}]`);
	}

	if (min !== 0) {
		parts.push(`[${prefix}arguments.length>=${min}]`);
	}

	if (Number.isFinite(max)) {
		parts.push(`[${prefix}arguments.length<=${max}]`);
	}

	if (!allowSpreadElement) {
		const maxArguments = Number.isFinite(max) ? max : length;
		if (typeof maxArguments === 'number') {
			// Exclude arguments with `SpreadElement` type
			for (let index = 0; index < maxArguments; index += 1) {
				parts.push(`[${prefix}arguments.${index}.type!="SpreadElement"]`);
			}
		}
	}

	if (Array.isArray(names) && names.length > 0) {
		parts.push(
			`[${prefix}callee.type="Identifier"]`,
			matches(names.map(property => `[${prefix}callee.name="${property}"]`))
		);
	}

	return parts.join('');
}

const callExpressionSelector = options => create(options, ['CallExpression']);
const newExpressionSelector = options => create(options, ['NewExpression']);
const callOrNewExpressionSelector = options => create(options, ['CallExpression', 'NewExpression']);

module.exports = {
	newExpressionSelector,
	callExpressionSelector,
	callOrNewExpressionSelector
};
