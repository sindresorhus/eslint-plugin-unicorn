'use strict';
const {pick} = require('lodash');
const isMemberExpression = require('./is-member-expression.js');
const {isCallExpression} = require('./call-or-new-expression.js');

/**
@param {
	{
		// `isCallExpression` options
		argumentsLength?: number,
		minimumArguments?: number,
		maximumArguments?: number,
		optionalCall?: boolean,
		allowSpreadElement?: boolean,

		// `isMemberExpression` options
		method?: string,
		methods?: string[],
		object?: string,
		objects?: string[],
		optionalMember?: boolean,
		computed?: boolean
	} | string | string[]
} [options]
@returns {string}
*/
function isMethodCall(node, options) {
	if (typeof options === 'string') {
		options = {methods: [options]};
	}

	if (Array.isArray(options)) {
		options = {methods: options};
	}

	const {
		optionalCall,
		optionalMember,
		method,
		methods,
	} = {
		method: '',
		methods: [],
		...options,
	};

	return (
		isCallExpression(node, {
			...pick(options, ['argumentsLength', 'minimumArguments', 'maximumArguments', 'allowSpreadElement']),
			optional: optionalCall,
		})
		&& isMemberExpression(node.callee, {
			...pick(options, ['object', 'objects', 'computed']),
			property: method,
			properties: methods,
			optional: optionalMember,
		})
	);
}

module.exports = isMethodCall;
