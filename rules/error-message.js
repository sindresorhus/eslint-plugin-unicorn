import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {isCallOrNewExpression} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';
import {
	getStaticValueIfNoSideEffects,
	getStaticValueForControlFlow,
	isBranchExpression,
	hasPotentiallyMutableMemberAccess,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_MISSING_MESSAGE = 'missing-message';
const MESSAGE_ID_EMPTY_MESSAGE = 'message-is-empty-string';
const MESSAGE_ID_NOT_STRING = 'message-is-not-a-string';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the `{{constructorName}}` constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.',
	[MESSAGE_ID_NOT_STRING]: 'Error message should be a string.',
};

const messageArgumentIndexes = new Map([
	['AggregateError', 1],
	['SuppressedError', 2],
]);

const isObjectFreezeMemberExpression = (node, context) => {
	if (node.type === 'Identifier') {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		node = definition?.type === 'Variable'
			&& definition.parent?.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
			? definition.node.init
			: node;
	}

	return node.type === 'MemberExpression'
		&& node.object.type === 'CallExpression'
		&& node.object.callee.type === 'MemberExpression'
		&& !node.object.callee.computed
		&& node.object.callee.object.type === 'Identifier'
		&& node.object.callee.object.name === 'Object'
		&& node.object.callee.property.type === 'Identifier'
		&& node.object.callee.property.name === 'freeze';
};

const getStaticValueForNode = (node, context) => {
	const staticValueNode = unwrapTypeScriptExpression(node);
	const isBranch = isBranchExpression(staticValueNode);
	if (isBranch || hasPotentiallyMutableMemberAccess(staticValueNode, context)) {
		if (isObjectFreezeMemberExpression(staticValueNode, context)) {
			return getStaticValue(staticValueNode, context.sourceCode.getScope(node));
		}

		return isBranch
			? getStaticValueForControlFlow(staticValueNode, context)
			: getStaticValueIfNoSideEffects(staticValueNode, context);
	}

	return getStaticValue(staticValueNode, context.sourceCode.getScope(node));
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on(['CallExpression', 'NewExpression'], expression => {
		if (!(
			isCallOrNewExpression(expression, {
				names: builtinErrors,
				optional: false,
			})
			&& context.sourceCode.isGlobalReference(expression.callee)
		)) {
			return;
		}

		const constructorName = expression.callee.name;
		const messageArgumentIndex = messageArgumentIndexes.has(constructorName)
			? messageArgumentIndexes.get(constructorName)
			: 0;
		const callArguments = expression.arguments;

		// If message is `SpreadElement` or there is `SpreadElement` before message
		if (callArguments.some((node, index) => index <= messageArgumentIndex && node.type === 'SpreadElement')) {
			return;
		}

		const node = callArguments[messageArgumentIndex];
		if (!node) {
			return {
				node: expression,
				messageId: MESSAGE_ID_MISSING_MESSAGE,
				data: {constructorName},
			};
		}

		// These types can't be string, and `getStaticValue` may not know the value
		// Add more types, if issue reported
		if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression') {
			return {
				node,
				messageId: MESSAGE_ID_NOT_STRING,
			};
		}

		const staticResult = getStaticValueForNode(node, context);

		// We don't know the value of `message`
		if (!staticResult) {
			return;
		}

		const {value} = staticResult;
		if (typeof value !== 'string') {
			return {
				node,
				messageId: MESSAGE_ID_NOT_STRING,
			};
		}

		if (value === '') {
			return {
				node,
				messageId: MESSAGE_ID_EMPTY_MESSAGE,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce passing a `message` value when creating a built-in error.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
