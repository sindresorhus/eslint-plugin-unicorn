'use strict';
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
			argumentsLength: options.argumentsLength,
			minimumArguments: options.minimumArguments,
			maximumArguments: options.maximumArguments,
			allowSpreadElement: options.allowSpreadElement,
			optional: optionalCall,
		})
		&& isMemberExpression(node.callee, {
			object: options.object,
			objects: options.objects,
			computed: options.computed,
			property: method,
			properties: methods,
			optional: optionalMember,
		})
	);
}

module.exports = isMethodCall;
