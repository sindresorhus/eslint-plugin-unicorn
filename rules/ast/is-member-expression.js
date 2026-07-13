import matchesNameConstraint, {hasNameConstraint} from './matches-name-constraint.js';

const noOptions = {};

/**
@param {
	{
		property?: string,
		properties?: string[],
		object?: string,
		objects?: string[],
		optional?: boolean,
		computed?: boolean
	} | string | string[]
} [options]
@returns {string}
*/
export default function isMemberExpression(node, options) {
	if (node?.type !== 'MemberExpression') {
		return false;
	}

	if (typeof options === 'string') {
		options = {properties: [options]};
	} else if (Array.isArray(options)) {
		options = {properties: options};
	}

	let {
		property,
		properties,
		object,
		objects,
		optional,
		computed,
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

	if (hasNameConstraint(property, properties)) {
		if (!matchesNameConstraint(node.property, property, properties)) {
			return false;
		}

		computed ??= false;
	}

	if (
		(computed === true && (node.computed !== computed))
		|| (
			computed === false
			// `node.computed` can be `undefined` in some parsers
			&& node.computed
		)
	) {
		return false;
	}

	return matchesNameConstraint(node.object, object, objects);
}
