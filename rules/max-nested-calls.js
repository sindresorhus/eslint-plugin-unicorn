import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'max-nested-calls';
const messages = {
	[MESSAGE_ID]: 'Call is nested too deeply. Maximum allowed is {{max}}.',
};

const DEFAULT_MAX = 3;

const callNodeTypes = [
	'CallExpression',
	'NewExpression',
];

const boundaryNodeTypes = new Set([
	...functionTypes,
	'ClassDeclaration',
	'ClassExpression',
	'StaticBlock',
]);

const isCallOrNewExpression = node => callNodeTypes.includes(node.type);
const isBoundaryNode = node => boundaryNodeTypes.has(node.type);

const isInsideArguments = (node, callExpression) => {
	let child = node;
	let {parent} = node;

	while (parent) {
		if (parent === callExpression) {
			return callExpression.arguments.includes(child);
		}

		if (isBoundaryNode(parent)) {
			return false;
		}

		child = parent;
		parent = child.parent;
	}

	return false;
};

const getNestedCallDepth = (node, sourceCode) => {
	let depth = 1;

	for (const ancestor of sourceCode.getAncestors(node).toReversed()) {
		if (isBoundaryNode(ancestor)) {
			return depth;
		}

		if (
			isCallOrNewExpression(ancestor)
			&& isInsideArguments(node, ancestor)
		) {
			depth++;
		}
	}

	return depth;
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			max: {
				type: 'integer',
				minimum: 1,
				description: 'The maximum allowed nested call depth.',
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {max} = context.options[0];

	context.on(callNodeTypes, node => {
		const depth = getNestedCallDepth(node, sourceCode);

		if (depth <= max) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				max,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Limit the depth of nested calls.',
			recommended: true,
		},
		schema,
		defaultOptions: [{max: DEFAULT_MAX}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
