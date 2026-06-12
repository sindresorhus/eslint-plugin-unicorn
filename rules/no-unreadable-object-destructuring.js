const MESSAGE_ID_COMPUTED_KEY = 'computed-key';
const MESSAGE_ID_NESTED_ARRAY = 'nested-array';
const MESSAGE_ID_DEEP_OBJECT = 'deep-object';

const messages = {
	[MESSAGE_ID_COMPUTED_KEY]: 'Do not use computed keys in object destructuring.',
	[MESSAGE_ID_NESTED_ARRAY]: 'Do not use array destructuring inside object destructuring.',
	[MESSAGE_ID_DEEP_OBJECT]: 'Do not use object destructuring deeper than two levels.',
};

function getParentPattern(node) {
	const {parent} = node;

	if (!parent) {
		return;
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

	if (parent.type === 'ArrayPattern') {
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

function isInsideObjectPattern(node) {
	while (node) {
		if (node.type === 'ObjectPattern') {
			return true;
		}

		node = getParentPattern(node);
	}

	return false;
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

		return {
			node,
			messageId: MESSAGE_ID_COMPUTED_KEY,
		};
	});

	context.on('ArrayPattern', node => {
		if (!isInsideObjectPattern(node)) {
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
