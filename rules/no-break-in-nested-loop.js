import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'no-break-in-nested-loop';
const messages = {
	[MESSAGE_ID]: 'Move this nested loop or switch into a function instead of using `{{keyword}}` here.',
};

const loopNodeTypes = new Set([
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'WhileStatement',
]);

const controlFlowNodeTypes = new Set([
	...loopNodeTypes,
	'SwitchStatement',
]);

const getKeyword = node => node.type === 'BreakStatement' ? 'break' : 'continue';
const isFunction = node => functionTypes.includes(node.type);
const isLoopNode = node => loopNodeTypes.has(node.type);
const isControlFlowNode = node => controlFlowNodeTypes.has(node.type);
const isTargetNode = (node, ancestor) =>
	node.type === 'BreakStatement'
		? isControlFlowNode(ancestor)
		: isLoopNode(ancestor);

function isNestedControlFlowStatement(node, sourceCode) {
	if (node.label) {
		return false;
	}

	const ancestors = sourceCode.getAncestors(node).toReversed();
	let hasCrossedControlFlowNode = false;

	for (const [index, ancestor] of ancestors.entries()) {
		if (isFunction(ancestor)) {
			return false;
		}

		if (!isTargetNode(node, ancestor)) {
			if (isControlFlowNode(ancestor)) {
				hasCrossedControlFlowNode = true;
			}

			continue;
		}

		if (hasCrossedControlFlowNode && isLoopNode(ancestor)) {
			return true;
		}

		for (let outerIndex = index + 1; outerIndex < ancestors.length; outerIndex++) {
			const outerAncestor = ancestors[outerIndex];

			if (isFunction(outerAncestor)) {
				return false;
			}

			if (isLoopNode(outerAncestor)) {
				return true;
			}
		}

		return false;
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on([
		'BreakStatement',
		'ContinueStatement',
	], node => {
		if (!isNestedControlFlowStatement(node, sourceCode)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				keyword: getKeyword(node),
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
			description: 'Disallow `break` and `continue` in nested loops and switches.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
