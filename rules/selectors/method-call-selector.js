'use strict';
const memberExpressionSelector = require('./member-expression-selector');

function methodCallSelector(options) {
	const {
		name,
		names,
		length,
		object,
		objects,
		min,
		max,
		path,
		includeOptionalCall,
		includeOptionalMember,
		allowSpreadElement
	} = {
		min: 0,
		max: Number.POSITIVE_INFINITY,
		includeOptionalCall: false,
		includeOptionalMember: false,
		allowSpreadElement: false,
		path: '',
		...options
	};

	const prefix = path ? `${path}.` : '';

	const parts = [
		`[${prefix}type="CallExpression"]`
	];

	if (!includeOptionalCall) {
		parts.push(`[${prefix}optional!=true]`);
	}

	parts.push(memberExpressionSelector({
		path: `${prefix}callee`,
		name,
		names,
		object,
		objects,
		includeOptional: includeOptionalMember
	}));

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

module.exports = methodCallSelector;
