'use strict';

/**
@typedef {
	{
		path?: string,
		name?: string,
		names?: string[],
		argumentsLength?: number,
		minimumArguments?: number,
		maximumArguments?: number,
		includeOptional?: boolean,
		allowSpreadElement?: boolean,
	} | string | string[]
} CallOrNewExpressionOptions
*/
function create(node, options, type) {
	if (node?.type !== type) {
		return false;
	}

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
		argumentsLength,
		minimumArguments,
		maximumArguments,
		includeOptional,
		allowSpreadElement,
	} = {
		path: '',
		minimumArguments: 0,
		maximumArguments: Number.POSITIVE_INFINITY,
		includeOptional: false,
		allowSpreadElement: false,
		...options,
	};

	if (name) {
		names = [name];
	}

	if (!includeOptional && node.optional) {
		return false;
	}

	if (typeof argumentsLength === 'number' && node.arguments.length !== argumentsLength) {
		return false;
	}

	if (minimumArguments !== 0 && node.arguments.length < minimumArguments) {
		return false;
	}

	if (Number.isFinite(maximumArguments) && node.arguments.length > maximumArguments) {
		return false;
	}

	if (!allowSpreadElement) {
		const maximumArgumentsLength = Number.isFinite(maximumArguments) ? maximumArguments : argumentsLength;
		if (
			typeof maximumArgumentsLength === 'number' &&
			node.arguments.some((node, index) => node.type === 'SpreadElement' && index < maximumArgumentsLength)
		) {
			return false;
		}
	}

	if (
		Array.isArray(names)
		&& names.length > 0
		&& (
			node.callee.type !== 'Identifier'
			|| !names.includes(node.callee.name)
		)
	) {
		return false;
	}

	return true;
}

/**
@param {CallOrNewExpressionOptions} [options]
@returns {boolean}
*/
const isCallExpression = (node, options) => create(node, options, 'CallExpression');

/**
@param {CallOrNewExpressionOptions} [options]
@returns {boolean}
*/
const isNewExpression = (node, options) => create(node, options, 'NewExpression');

module.exports = {
	isCallExpression,
	isNewExpression,
};
