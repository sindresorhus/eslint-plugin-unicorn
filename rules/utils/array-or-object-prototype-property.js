'use strict';
const {isMemberExpression} = require('../ast/index.js');

/**
@param {
	{
		object?: string,
		method?: string,
		methods?: string[],
	}
} [options]
@returns {string}
*/
function isPrototypeProperty(node, options) {
	const {
		object,
		property,
		properties,
	} = {
		property: '',
		properties: [],
		...options,
	};

	if (!isMemberExpression(node, {
		property,
		properties,
		optional: false,
	})) {
		return;
	}

	const objectNode = node.object;

	// `Object.prototype.method` or `Array.prototype.method`
	if (isMemberExpression(objectNode, {
		object,
		property: 'prototype',
		optional: false,
	})) {
		return true;
	}


	switch (object) {
		case 'Array': {
			// `[].method`
			return objectNode.type === 'ArrayExpression' && objectNode.elements.length === 0;
		}

		case 'Object': {
			// `{}.method`
			return objectNode.type === 'ObjectExpression' && objectNode.properties.length === 0;
		}
		// No default
	}

	return false;
}

const isArrayPrototypeProperty = (node, options) => isPrototypeProperty(node, {...options, object: 'Array'});
const isObjectPrototypeProperty = (node, options) => isPrototypeProperty(node, {...options, object: 'Object'});

module.exports = {
	isArrayPrototypeProperty,
	isObjectPrototypeProperty,
};
