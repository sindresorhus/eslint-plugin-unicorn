import {getPropertyName} from '@eslint-community/eslint-utils';
import {isNullLiteral, isMethodCall} from './ast/index.js';
import {getParenthesizedText} from './utils/index.js';

const MESSAGE_ID = 'prefer-reflect-apply';
const messages = {
	[MESSAGE_ID]: 'Prefer `Reflect.apply()` over `Function#apply()`.',
};

const isApplySignature = (argument1, argument2) => (
	(
		isNullLiteral(argument1)
		|| argument1.type === 'ThisExpression'
	)
	&& (
		argument2.type === 'ArrayExpression'
		|| (argument2.type === 'Identifier' && argument2.name === 'arguments')
	)
);

// A `SequenceExpression` is not a valid call argument without parentheses, and the parentheses are not part of its range
const getTargetText = (node, context) => (
	node.type === 'SequenceExpression'
		? getParenthesizedText(node, context)
		: context.sourceCode.getText(node)
);

// `super` is only valid as `super.method`, never as a standalone expression
const isValidCallArgument = node => node.type !== 'Super';

const getReflectApplyCall = (target, receiver, argumentsList, context) => (
	`Reflect.apply(${getTargetText(target, context)}, ${context.sourceCode.getText(receiver)}, ${context.sourceCode.getText(argumentsList)})`
);

const fixDirectApplyCall = (node, context) => {
	if (
		getPropertyName(node.callee) === 'apply'
		&& node.arguments.length === 2
		&& isValidCallArgument(node.callee.object)
		&& isApplySignature(node.arguments[0], node.arguments[1])
	) {
		return fixer => (
			fixer.replaceText(
				node,
				getReflectApplyCall(node.callee.object, node.arguments[0], node.arguments[1], context),
			)
		);
	}
};

const fixFunctionPrototypeCall = (node, context) => {
	if (
		getPropertyName(node.callee) === 'call'
		&& getPropertyName(node.callee.object) === 'apply'
		&& getPropertyName(node.callee.object.object) === 'prototype'
		&& node.callee.object.object.object?.type === 'Identifier'
		&& node.callee.object.object.object.name === 'Function'
		&& node.arguments.length === 3
		&& isApplySignature(node.arguments[1], node.arguments[2])
	) {
		return fixer => (
			fixer.replaceText(
				node,
				getReflectApplyCall(node.arguments[0], node.arguments[1], node.arguments[2], context),
			)
		);
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				optionalCall: false,
				optionalMember: false,
			})
			|| node.callee.object.type === 'Literal'
			|| node.callee.object.type === 'ArrayExpression'
			|| node.callee.object.type === 'ObjectExpression'
		) {
			return;
		}

		const fix = fixDirectApplyCall(node, context) || fixFunctionPrototypeCall(node, context);
		if (fix) {
			return {
				node,
				messageId: MESSAGE_ID,
				// The call is rebuilt from the callee object and the argument nodes, a comment in between would be dropped
				fix: context.sourceCode.getCommentsInside(node).length > 0 ? undefined : fix,
			};
		}
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
			description: 'Prefer `Reflect.apply()` over `Function#apply()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
