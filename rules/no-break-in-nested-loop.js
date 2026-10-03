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

		// A loop that encloses the target is what makes this `break` or `continue` nested, whatever sits between the two, like a `switch`.
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

// Only called after `isNestedControlFlowStatement`, which already checked that the statement is unlabeled and that a loop encloses it within the same function
const isContinueInSwitchInsideLoop = (node, sourceCode) =>
	node.type === 'ContinueStatement'
	&& sourceCode.getAncestors(node).findLast(ancestor => isLoop(ancestor) || ancestor.type === 'SwitchStatement').type === 'SwitchStatement';

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {checkContinue} = context.options[0];

	context.on([
		'BreakStatement',
		'ContinueStatement',
	], node => {
		if (node.type === 'ContinueStatement' && !checkContinue) {
			return;
		}

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

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `break` and optionally `continue` in nested loops and switches inside loops.',
			recommended: true,
		},
		schema: [{
			type: 'object',
			additionalProperties: false,
			properties: {
				checkContinue: {
					type: 'boolean',
					description: 'Whether to also check unlabeled `continue` statements in nested loops and switches inside loops.',
				},
			},
		}],
		defaultOptions: [{checkContinue: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
