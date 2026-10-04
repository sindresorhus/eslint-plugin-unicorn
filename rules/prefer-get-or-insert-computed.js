import {
	isCallExpression,
	isDirectEvalCall,
	isFunction,
	isMethodCall,
} from './ast/index.js';
import {replaceArgument} from './fix/index.js';
import {containsNode, getParenthesizedRange, hasCommentInRange} from './utils/index.js';

const MESSAGE_ID = 'prefer-get-or-insert-computed';
const messages = {
	[MESSAGE_ID]: 'Prefer `.getOrInsertComputed()` when the default value has side effects.',
};

const shouldUseDirectCallback = (key, value) =>
	key.type === 'Identifier'
	&& isCallExpression(value, {
		argumentsLength: 1,
		optional: false,
	})
	&& value.callee.type === 'Identifier'
	&& value.arguments[0].type === 'Identifier'
	&& value.arguments[0].name === key.name;

const isInstanceField = node => node.type === 'PropertyDefinition' && !node.static;

// Nested functions and the values of non-static class fields are not evaluated when the default value is created, but computed keys of non-static fields are.
const containsNodeMatching = (node, context, predicate) => containsNode(
	node,
	context,
	node => predicate(node) || (isInstanceField(node) && node.computed && containsNodeMatching(node.key, context, predicate)),
	node => isFunction(node) || isInstanceField(node),
);

const shouldWrapArrowBody = node =>
	node.type === 'ObjectExpression'
	|| node.type === 'SequenceExpression';

// Node types that have a side effect when evaluated. This mirrors the default behavior of
// `hasSideEffect` from `@eslint-community/eslint-utils`, plus `TaggedTemplateExpression`,
// which is effectively a function call but is not covered by that helper. Detecting them
// through `containsNodeMatching` (rather than `hasSideEffect`) means side effects inside
// nested functions and non-static class field initializers are correctly ignored, since
// those are not evaluated when the default value expression is created.
const sideEffectNodeTypes = new Set([
	'AssignmentExpression',
	'AwaitExpression',
	'CallExpression',
	'ImportExpression',
	'NewExpression',
	'TaggedTemplateExpression',
	'UpdateExpression',
	'YieldExpression',
]);

const isSideEffectNode = node =>
	sideEffectNodeTypes.has(node.type)
	|| (node.type === 'UnaryExpression' && node.operator === 'delete');

const hasDefaultValueSideEffect = (node, context) =>
	containsNodeMatching(node, context, isSideEffectNode);

const containsNodeUnsafeToWrap = (node, context) =>
	containsNodeMatching(node, context, node =>
		node.type === 'AwaitExpression'
		|| node.type === 'YieldExpression'
		|| isDirectEvalCall(node));

const getCallbackText = (key, value, sourceCode) => {
	if (shouldUseDirectCallback(key, value)) {
		return sourceCode.getText(value.callee);
	}

	const valueText = sourceCode.getText(value);
	return `() => ${shouldWrapArrowBody(value) ? `(${valueText})` : valueText}`;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'getOrInsert',
			argumentsLength: 2,
			computed: false,
		})) {
			return;
		}

		const [key, value] = callExpression.arguments;
		if (!hasDefaultValueSideEffect(value, context)) {
			return;
		}

		const problem = {
			node: value,
			messageId: MESSAGE_ID,
		};

		if (
			containsNodeUnsafeToWrap(value, context)
			|| hasCommentInRange(context, getParenthesizedRange(value, context))
		) {
			return problem;
		}

		problem.fix = function * (fixer) {
			yield fixer.replaceText(callExpression.callee.property, 'getOrInsertComputed');
			yield replaceArgument(fixer, value, getCallbackText(key, value, sourceCode), context);
		};

		return problem;
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
			description: 'Prefer `.getOrInsertComputed()` when the default value has side effects.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
