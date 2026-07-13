import matchesNameConstraint from './matches-name-constraint.js';

const noOptions = {};

const callExpressionTypes = ['CallExpression'];
const newExpressionTypes = ['NewExpression'];
const callOrNewExpressionTypes = ['CallExpression', 'NewExpression'];

/**
@typedef {
	{
		name?: string,
		names?: string[],
		argumentsLength?: number,
		minimumArguments?: number,
		maximumArguments?: number,
		allowSpreadElement?: boolean,
		optional?: boolean,
	} | string | string[]
} CallOrNewExpressionCheckOptions
*/
// eslint-disable-next-line complexity
function create(node, options, types) {
	if (!types.includes(node?.type)) {
		return false;
	}

	if (typeof options === 'string') {
		options = {names: [options]};
	} else if (Array.isArray(options)) {
		options = {names: options};
	}

	const {
		name,
		names,
		argumentsLength,
		minimumArguments = 0,
		maximumArguments = Infinity,
		allowSpreadElement = false,
		optional,
	} = options ?? noOptions;

	if (
		(optional === true && (node.optional !== optional))
		|| (
			optional === false
			// `node.optional` can be `undefined` in some parsers
			&& node.optional
		)
	) {
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
			typeof maximumArgumentsLength === 'number'
			&& node.arguments.some((node, index) =>
				node.type === 'SpreadElement'
				&& index < maximumArgumentsLength)
		) {
			return false;
		}
	}

	return matchesNameConstraint(node.callee, name, names);
}

/**
@param {CallOrNewExpressionCheckOptions} [options]
@returns {boolean}
*/
export const isCallExpression = (node, options) => create(node, options, callExpressionTypes);

/**
@param {CallOrNewExpressionCheckOptions} [options]
@returns {boolean}
*/
export const isNewExpression = (node, options) => {
	if (typeof options?.optional === 'boolean') {
		throw new TypeError('Cannot check node.optional in `isNewExpression`.');
	}

	return create(node, options, newExpressionTypes);
};

/**
@param {CallOrNewExpressionCheckOptions} [options]
@returns {boolean}
*/
export const isCallOrNewExpression = (node, options) => create(node, options, callOrNewExpressionTypes);
