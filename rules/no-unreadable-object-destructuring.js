import {getStaticValue} from '@eslint-community/eslint-utils';
import {isTypeScriptExpressionWrapper} from './utils/index.js';

const MESSAGE_ID_COMPUTED_KEY = 'computed-key';
const MESSAGE_ID_NESTED_ARRAY = 'nested-array';
const MESSAGE_ID_DEEP_OBJECT = 'deep-object';
const MESSAGE_ID_PROPERTY_ASSIGNMENT = 'property-assignment';

const messages = {
	[MESSAGE_ID_COMPUTED_KEY]: 'Do not use computed keys in object destructuring.',
	[MESSAGE_ID_NESTED_ARRAY]: 'Do not use array destructuring inside object destructuring.',
	[MESSAGE_ID_DEEP_OBJECT]: 'Do not use object destructuring deeper than two levels.',
	[MESSAGE_ID_PROPERTY_ASSIGNMENT]: 'Do not assign destructured values to object properties.',
};

function getParentPattern(node) {
	const {parent} = node;

	if (!parent) {
		return;
	}

	if (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'AssignmentPattern'
		&& parent.left === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'RestElement'
		&& parent.argument === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'Property'
		&& parent.value === node
		&& parent.parent.type === 'ObjectPattern'
	) {
		return parent.parent;
	}

	if (
		parent.type === 'ObjectPattern'
		|| parent.type === 'ArrayPattern'
	) {
		return parent;
	}
}

function getObjectPatternDepth(node) {
	let depth = 0;

	while (node) {
		if (node.type === 'ObjectPattern') {
			depth++;
		}

		node = getParentPattern(node);
	}

	return depth;
}

function isStaticComputedKey(node, scope) {
	return getStaticValue(node, scope) !== null;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Property', node => {
		if (
			node.parent.type !== 'ObjectPattern'
			|| !node.computed
		) {
			return;
		}

		// A computed key is the only way to exclude a dynamic property from a rest element,
		// so allow it when the same object pattern collects a rest. A static key is not
		// dynamic, so it stays disallowed.
		if (
			!isStaticComputedKey(node.key, context.sourceCode.getScope(node.key))
			&& node.parent.properties.some(property => property.type === 'RestElement')
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_COMPUTED_KEY,
		};
	});

	context.on('ArrayPattern', node => {
		if (getObjectPatternDepth(node) === 0) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_NESTED_ARRAY,
		};
	});

	context.on('ObjectPattern', node => {
		if (getObjectPatternDepth(node) !== 3) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_DEEP_OBJECT,
		};
	});

	context.on('MemberExpression', node => {
		if (getParentPattern(node)?.type !== 'ObjectPattern') {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_PROPERTY_ASSIGNMENT,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable object destructuring.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
