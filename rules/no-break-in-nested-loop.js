import {isFunction, isLoop, loopTypes} from './ast/index.js';

const MESSAGE_ID = 'no-break-in-nested-loop';
const SWITCH_CONTINUE_MESSAGE_ID = 'switch-continue';
const messages = {
	[MESSAGE_ID]: 'Move this nested loop or switch into a function instead of using `{{keyword}}` here.',
	[SWITCH_CONTINUE_MESSAGE_ID]: 'An unlabeled `continue` inside a `switch` continues the surrounding loop, not the next `case`. Use a labeled `continue` if that is intentional.',
};

const controlFlowNodeTypes = new Set([
	...loopTypes,
	'SwitchStatement',
]);

const getKeyword = node => node.type === 'BreakStatement' ? 'break' : 'continue';
const isControlFlowNode = node => controlFlowNodeTypes.has(node.type);
const isTargetNode = (node, ancestor) =>
	node.type === 'BreakStatement'
		? isControlFlowNode(ancestor)
		: isLoop(ancestor);

function isNestedControlFlowStatement(node, sourceCode) {
	if (node.label) {
		return false;
	}

	const ancestors = sourceCode.getAncestors(node).toReversed();
	let hasInnerControlFlowNode = false;
	let hasTargetNode = false;

	for (const ancestor of ancestors) {
		if (isFunction(ancestor)) {
			return false;
		}

		if (hasTargetNode && isLoop(ancestor)) {
			return true;
		}

		if (hasTargetNode) {
			continue;
		}

		if (isTargetNode(node, ancestor)) {
			if (hasInnerControlFlowNode && isLoop(ancestor)) {
				return true;
			}

			hasTargetNode = true;
			continue;
		}

		if (isControlFlowNode(ancestor)) {
			hasInnerControlFlowNode = true;
		}
	}

	return false;
}

function isContinueInSwitchInsideLoop(node, sourceCode) {
	if (node.type !== 'ContinueStatement' || node.label) {
		return false;
	}

	let hasSwitch = false;

	for (const ancestor of sourceCode.getAncestors(node).toReversed()) {
		if (isFunction(ancestor)) {
			return false;
		}

		if (isLoop(ancestor)) {
			return hasSwitch;
		}

		if (ancestor.type === 'SwitchStatement') {
			hasSwitch = true;
		}
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

		if (isContinueInSwitchInsideLoop(node, sourceCode)) {
			return {
				node,
				messageId: SWITCH_CONTINUE_MESSAGE_ID,
			};
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
			description: 'Disallow `break` and `continue` in nested loops and switches inside loops.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
