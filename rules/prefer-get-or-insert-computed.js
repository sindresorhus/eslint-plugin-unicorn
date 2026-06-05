import {isCallExpression, isFunction, isMethodCall} from './ast/index.js';
import {replaceArgument} from './fix/index.js';
import {getParenthesizedRange} from './utils/index.js';

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

const containsNodeMatching = (node, sourceCode, predicate) => {
	if (isFunction(node)) {
		return false;
	}

	if (node.type === 'PropertyDefinition' && !node.static) {
		return node.computed && containsNodeMatching(node.key, sourceCode, predicate);
	}

	if (predicate(node)) {
		return true;
	}

	const keys = sourceCode.visitorKeys[node.type] ?? [];
	for (const key of keys) {
		const child = node[key];
		if (Array.isArray(child)) {
			for (const childNode of child) {
				if (childNode && containsNodeMatching(childNode, sourceCode, predicate)) {
					return true;
				}
			}

			continue;
		}

		if (child && containsNodeMatching(child, sourceCode, predicate)) {
			return true;
		}
	}

	return false;
};

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

const hasDefaultValueSideEffect = (node, sourceCode) =>
	containsNodeMatching(node, sourceCode, isSideEffectNode);

const containsNodeUnsafeToWrap = (node, sourceCode) =>
	containsNodeMatching(node, sourceCode, node =>
		node.type === 'AwaitExpression'
		|| node.type === 'YieldExpression'
		|| isCallExpression(node, {name: 'eval'}));

const hasCommentsInDefaultValue = (node, context) => {
	const {sourceCode} = context;
	const range = getParenthesizedRange(node, context);
	return sourceCode.getAllComments().some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return commentRange[0] >= range[0] && commentRange[1] <= range[1];
	});
};

const getCallbackText = (key, value, sourceCode) => {
	if (shouldUseDirectCallback(key, value)) {
		return sourceCode.getText(value.callee);
	}

	const valueText = sourceCode.getText(value);
	return `() => ${shouldWrapArrowBody(value) ? `(${valueText})` : valueText}`;
};

/** @param {import('eslint').Rule.RuleContext} context */
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
		if (!hasDefaultValueSideEffect(value, sourceCode)) {
			return;
		}

		const problem = {
			node: value,
			messageId: MESSAGE_ID,
		};

		if (
			containsNodeUnsafeToWrap(value, sourceCode)
			|| hasCommentsInDefaultValue(value, context)
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

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
