import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall, isNumericLiteral} from './ast/index.js';
import {removeExpressionStatement} from './fix/index.js';
import {getParenthesizedText, isSameReference, isValueNotUsable} from './utils/index.js';

const MESSAGE_ID_NO_OP = 'no-op';
const MESSAGE_ID_SHIFT = 'shift';
const MESSAGE_ID_UNSHIFT = 'unshift';
const MESSAGE_ID_POP = 'pop';
const MESSAGE_ID_PUSH = 'push';
const MESSAGE_ID_EMPTY = 'empty';

const messages = {
	[MESSAGE_ID_NO_OP]: 'This `splice()` call does not change the array.',
	[MESSAGE_ID_SHIFT]: 'Prefer `.shift()` over `.splice()`.',
	[MESSAGE_ID_UNSHIFT]: 'Prefer `.unshift()` over `.splice()`.',
	[MESSAGE_ID_POP]: 'Prefer `.pop()` over `.splice()`.',
	[MESSAGE_ID_PUSH]: 'Prefer `.push()` over `.splice()`.',
	[MESSAGE_ID_EMPTY]: 'Prefer setting `.length = 0` over `.splice()` to empty an array.',
};

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

function getStaticNumberValue(node) {
	if (
		[
			'TSAsExpression',
			'TSTypeAssertion',
			'TSNonNullExpression',
		].includes(node.type)
	) {
		return getStaticNumberValue(node.expression);
	}

	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'UnaryExpression'
		&& (node.operator === '+' || node.operator === '-')
		&& isNumericLiteral(node.argument)
	) {
		return node.operator === '-' ? -node.argument.value : node.argument.value;
	}
}

const isZero = node => Object.is(getStaticNumberValue(node), 0);
const isOne = node => getStaticNumberValue(node) === 1;
const isZeroOrNegative = node => getStaticNumberValue(node) <= 0;

const isLengthMemberExpressionFor = (node, object) =>
	node.type === 'MemberExpression'
	&& !node.optional
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
	&& !node.computed
	&& isSameReference(node.object, object);

const isLengthMinusOneFor = (node, object) =>
	node.type === 'BinaryExpression'
	&& node.operator === '-'
	&& isOne(node.right)
	&& isLengthMemberExpressionFor(node.left, object);

function getReplacement(callExpression) {
	const {arguments: arguments_, callee} = callExpression;
	const {object} = callee;

	return getNoOpOrEmptyReplacement(arguments_, object) ?? getMethodReplacement(arguments_, object);
}

function getNoOpOrEmptyReplacement(arguments_, object) {
	if (arguments_.length === 0) {
		return {
			messageId: MESSAGE_ID_NO_OP,
			method: undefined,
			argumentsToKeep: [],
		};
	}

	if (
		arguments_.length === 1
		&& isZero(arguments_[0])
	) {
		return {
			messageId: MESSAGE_ID_EMPTY,
			method: 'length',
			argumentsToKeep: [],
			assignment: '0',
		};
	}

	if (
		arguments_.length === 2
		&& isZero(arguments_[0])
		&& isLengthMemberExpressionFor(arguments_[1], object)
	) {
		return {
			messageId: MESSAGE_ID_EMPTY,
			method: 'length',
			argumentsToKeep: [],
			assignment: '0',
		};
	}

	if (
		arguments_.length === 2
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_NO_OP,
			method: undefined,
			argumentsToKeep: [],
		};
	}
}

function getMethodReplacement(arguments_, object) {
	if (
		arguments_.length === 2
		&& isZero(arguments_[0])
		&& isOne(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_SHIFT,
			method: 'shift',
			argumentsToKeep: [],
		};
	}

	if (
		arguments_.length > 2
		&& isZero(arguments_[0])
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_UNSHIFT,
			method: 'unshift',
			argumentsToKeep: arguments_.slice(2),
		};
	}

	if (
		arguments_.length === 2
		&& isLengthMinusOneFor(arguments_[0], object)
		&& isOne(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_POP,
			method: 'pop',
			argumentsToKeep: [],
		};
	}

	if (
		arguments_.length > 2
		&& isLengthMemberExpressionFor(arguments_[0], object)
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_PUSH,
			method: 'push',
			argumentsToKeep: arguments_.slice(2),
		};
	}
}

function hasCommentsInside(node, sourceCode) {
	return sourceCode.getCommentsInside(node).length > 0;
}

const isRemovableStatement = node =>
	node.parent.type === 'Program'
	|| node.parent.type === 'BlockStatement';

function getFix(callExpression, replacement, context) {
	if (!isValueNotUsable(callExpression) || hasCommentsInside(callExpression, context.sourceCode)) {
		return;
	}

	const {object} = callExpression.callee;
	const objectText = getParenthesizedText(object, context);

	if (replacement.messageId === MESSAGE_ID_NO_OP) {
		if (
			!isRemovableStatement(callExpression.parent)
			|| hasSideEffect(object, context.sourceCode)
			|| callExpression.arguments.some(argument => hasSideEffect(argument, context.sourceCode))
		) {
			return;
		}

		return fixer => removeExpressionStatement(callExpression.parent, context, fixer);
	}

	if (replacement.messageId === MESSAGE_ID_EMPTY) {
		return fixer => fixer.replaceText(callExpression, `${objectText}.length = 0`);
	}

	return fixer => {
		const argumentsText = replacement.argumentsToKeep
			.map(node => context.sourceCode.getText(node))
			.join(', ');

		return fixer.replaceText(callExpression, `${objectText}.${replacement.method}(${argumentsText})`);
	};
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'splice',
			minimumArguments: 0,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		const replacement = getReplacement(callExpression);
		if (!replacement) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId: replacement.messageId,
			fix: getFix(callExpression, replacement, context),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `Array#splice()` when simpler alternatives exist.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
