'use strict';

const matches = require('./matches-any');

function create(options, types) {
	const {
		path,
		length,
		min,
		max,
		includeOptional,
		allowSpreadElement,
	} = {
		path: '',
		min: 0,
		max: Number.POSITIVE_INFINITY,
		includeOptional: false,
		allowSpreadElement: false,
		...options
	};

	const prefix = path ? `${path}.` : '';
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

	return parts.join('');
}

const callExpressionSelector = options => create(options, ['CallExpression']);
const newExpressionSelector = options => create(options, ['NewExpression']);
const callOrNewExpressionSelector = options => create(options, ['CallExpression', 'NewExpression']);

module.exports = {
	newExpressionSelector,
	callExpressionSelector,
	callOrNewExpressionSelector,
};
