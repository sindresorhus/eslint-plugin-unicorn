'use strict';
const matches = require('./matches-any.js');

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
function isMemberExpression(node, options) {
	if (node?.type !== 'MemberExpression') {
		return false;
	}

	if (typeof options === 'string') {
		options = {properties: [options]};
	}

	if (Array.isArray(options)) {
		options = {properties: options};
	}

	let {
		property,
		properties,
		object,
		objects,
		optional,
		computed,
	} = {
		path: '',
		property: '',
		properties: [],
		object: '',
		...options,
	};

	if (property) {
		properties = [property];
	}

	if (object) {
		objects = [object];
	}

	if (
		(computed === true && (node.computed !== computed))
		|| (
			computed === false
			// `node.computed` can be `undefined` in some parsers
			&& node.computed
		)
		|| (optional === true && (node.optional !== optional))
		|| (
			optional === false
			// `node.optional` can be `undefined` in some parsers
			&& node.optional
		)
	) {
		return false;
	}

	if (
		Array.isArray(properties)
		&& properties.length > 0
		&& (
			node.property.type !== 'Identifier'
			|| !properties.includes(node.property.name)
		)
	) {
		return false;
	}

	if (
		Array.isArray(objects)
		&& objects.length > 0
		&& (
			node.object.type !== 'Identifier'
			|| !objects.includes(node.object.name)
		)
	) {
		return false;
	}

	return true;
}

module.exports = memberExpressionSelector;
