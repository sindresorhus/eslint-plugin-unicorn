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
		method?: string,
		methods?: string[],
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
		options = {methods: [options]};
	}

	if (Array.isArray(options)) {
		options = {methods: options};
	}

	const {
		path,
		includeOptionalCall,
		includeOptionalMember,
		method,
		methods,
	} = {
		path: '',
		includeOptionalCall: false,
		includeOptionalMember: false,
		method: '',
		methods: [],
		...options,
	};

	const prefix = path ? `${path}.` : '';

	return [
		callExpressionSelector({
			...pick(options, ['path', 'length', 'min', 'max', 'allowSpreadElement']),
			includeOptional: includeOptionalCall,
		}),
		memberExpressionSelector({
			...pick(options, ['min', 'object', 'objects', 'allowComputed']),
			name: method,
			names: methods,
			path: `${prefix}callee`,
			includeOptional: includeOptionalMember,
		}),
	].join('');
}

module.exports = methodCallSelector;
