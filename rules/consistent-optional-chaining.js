import {
	getMemberAccessOperatorRange,
	hasCommentInRange,
	isSameReference,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_REMOVE_OPTIONAL = 'consistent-optional-chaining/remove-optional';
const MESSAGE_ID_USE_OPTIONAL = 'consistent-optional-chaining/use-optional';
const MESSAGE_ID_SUGGEST_REMOVE_OPTIONAL = 'consistent-optional-chaining/suggest-remove-optional';
const MESSAGE_ID_SUGGEST_USE_OPTIONAL = 'consistent-optional-chaining/suggest-use-optional';

const messages = {
	[MESSAGE_ID_REMOVE_OPTIONAL]: 'Remove unnecessary optional chaining.',
	[MESSAGE_ID_USE_OPTIONAL]: 'Use optional chaining consistently.',
	[MESSAGE_ID_SUGGEST_REMOVE_OPTIONAL]: 'Remove optional chaining.',
	[MESSAGE_ID_SUGGEST_USE_OPTIONAL]: 'Use optional chaining.',
};
const supportedBaseTypes = new Set([
	'Identifier',
	'ThisExpression',
	'Super',
]);

function unwrapExpression(node) {
	let previousNode;

	while (node !== previousNode) {
		previousNode = node;
		node = unwrapTypeScriptExpression(node);

		if (node.type === 'ChainExpression') {
			node = node.expression;
		}
	}

	return node;
}

function getMemberExpression(node) {
	node = unwrapExpression(node);

	return node.type === 'MemberExpression' ? node : undefined;
}

function getMemberBase(memberExpression) {
	return unwrapExpression(memberExpression.object);
}

function isSupportedMemberBase(node) {
	node = unwrapExpression(node);

	if (supportedBaseTypes.has(node.type)) {
		return true;
	}

	if (node.type === 'MemberExpression') {
		return isSupportedMemberBase(node.object);
	}

	return false;
}

function canReplaceMemberAccessOperator(memberExpression, context) {
	const range = getMemberAccessOperatorRange(memberExpression, context);

	return !hasCommentInRange(context, range);
}

function replaceMemberAccessOperator({memberExpression, context, fixer, replacement}) {
	const range = getMemberAccessOperatorRange(memberExpression, context);
	return fixer.replaceTextRange(range, replacement);
}

function removeOptionalChaining(memberExpression, context, fixer) {
	return replaceMemberAccessOperator({
		memberExpression,
		context,
		fixer,
		replacement: memberExpression.computed ? '[' : '.',
	});
}

function addOptionalChaining(memberExpression, context, fixer) {
	return replaceMemberAccessOperator({
		memberExpression,
		context,
		fixer,
		replacement: memberExpression.computed ? '?.[' : '?.',
	});
}

function getProblem(logicalExpression, context) {
	const {left, operator, right} = logicalExpression;
	const leftMemberExpression = getMemberExpression(left);
	const rightMemberExpression = getMemberExpression(right);

	if (
		!leftMemberExpression
		|| !rightMemberExpression
	) {
		return;
	}

	const leftMemberBase = getMemberBase(leftMemberExpression);
	const rightMemberBase = getMemberBase(rightMemberExpression);

	if (
		!isSupportedMemberBase(leftMemberBase)
		|| !isSupportedMemberBase(rightMemberBase)
		|| !isSameReference(leftMemberBase, rightMemberBase)
	) {
		return;
	}

	if (operator === '&&' && rightMemberExpression.optional) {
		return {
			node: rightMemberExpression,
			messageId: MESSAGE_ID_REMOVE_OPTIONAL,
			...(canReplaceMemberAccessOperator(rightMemberExpression, context) && {
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGEST_REMOVE_OPTIONAL,
						fix: fixer => removeOptionalChaining(rightMemberExpression, context, fixer),
					},
				],
			}),
		};
	}

	if (operator !== '||' || leftMemberExpression.optional === rightMemberExpression.optional) {
		return;
	}

	if (rightMemberExpression.optional) {
		return {
			node: rightMemberExpression,
			messageId: MESSAGE_ID_REMOVE_OPTIONAL,
			...(canReplaceMemberAccessOperator(rightMemberExpression, context) && {
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGEST_REMOVE_OPTIONAL,
						fix: fixer => removeOptionalChaining(rightMemberExpression, context, fixer),
					},
				],
			}),
		};
	}

	return {
		node: rightMemberExpression,
		messageId: MESSAGE_ID_USE_OPTIONAL,
		...(canReplaceMemberAccessOperator(rightMemberExpression, context) && {
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGEST_USE_OPTIONAL,
					fix: fixer => addOptionalChaining(rightMemberExpression, context, fixer),
				},
			],
		}),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('LogicalExpression', logicalExpression => getProblem(logicalExpression, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent optional chaining for same-base member access.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
