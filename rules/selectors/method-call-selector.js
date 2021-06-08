'use strict';
const {pick} = require('lodash');
const memberExpressionSelector = require('./member-expression-selector.js');
const {callExpressionSelector} = require('./call-or-new-expression-selector.js');

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
		includeOptionalCall,
		includeOptionalMember
	} = {
		path: '',
		includeOptionalCall: false,
		includeOptionalMember: false,
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
