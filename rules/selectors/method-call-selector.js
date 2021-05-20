'use strict';
const {pick} = require('lodash');
const memberExpressionSelector = require('./member-expression-selector');
const {callExpressionSelector} = require('./call-or-new-expression-selector');

/**
@param {
	{
		path?: string,

		// `CallExpression` options
		length?: string,
		min?: number,
		max?: number,
		includeOptionalCall?: boolean,
		allowSpreadElement?: boolean,

		// `MemberExpression` options
		name?: string,
		names?: string[],
		object?: string,
		objects?: string[],
		includeOptionalMember?: boolean,
		allowComputed?: boolean
	} | string | string[]
} [options]
@returns {string}
*/

function methodCallSelector(options) {
	if (typeof options === 'string') {
		options = {names: [options]};
	}

	if (Array.isArray(options)) {
		options = {names: options};
	}

	const {
		path,

		// `CallExpression` options
		length,
		min,
		max,
		includeOptionalCall,
		allowSpreadElement,

		// `MemberExpression` options
		name,
		names,
		object,
		objects,
		includeOptionalMember,
		allowComputed
	} = {
		path: '',

		min: 0,
		max: Number.POSITIVE_INFINITY,
		includeOptionalCall: false,
		allowSpreadElement: false,

		property: '',
		object: '',
		includeOptionalMember: false,
		allowComputed: false,

		...options
	};

	const prefix = path ? `${path}.` : '';

	return [
		callExpressionSelector({
			...pick(options, ['path', 'length', 'min', 'max', 'allowSpreadElement']),
			includeOptional: includeOptionalCall
		}),
		memberExpressionSelector({
			...pick(options, ['name', 'names', 'min', 'object', 'objects', 'allowComputed']),
			path: `${prefix}callee`,
			includeOptional: includeOptionalMember
		})
	].join('');
}

module.exports = methodCallSelector;
