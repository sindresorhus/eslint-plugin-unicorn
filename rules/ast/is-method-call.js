import isMemberExpression from './is-member-expression.js';
import {isCallExpression} from './call-or-new-expression.js';

const noOptions = {};

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
export default function isMethodCall(node, options) {
	// This is the most used AST check in the plugin, bail out on the node shape before touching the options.
	if (node?.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
		return false;
	}

	if (typeof options === 'string') {
		options = {methods: [options]};
	} else if (Array.isArray(options)) {
		options = {methods: options};
	}

	options ??= noOptions;

	return (
		isCallExpression(node, {
			argumentsLength: options.argumentsLength,
			minimumArguments: options.minimumArguments,
			maximumArguments: options.maximumArguments,
			allowSpreadElement: options.allowSpreadElement,
			optional: options.optionalCall,
		})
		&& isMemberExpression(node.callee, {
			object: options.object,
			objects: options.objects,
			computed: options.computed,
			property: options.method,
			properties: options.methods,
			optional: options.optionalMember,
		})
	);
}
