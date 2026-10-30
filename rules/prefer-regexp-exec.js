import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isCallOrNewExpression, isMethodCall} from './ast/index.js';
import {replaceStringRaw, swapMethodCallObjectAndArgument} from './fix/index.js';
import {
	getStaticRegExp,
	hasUnparenthesizedOptionalChainElement,
	isBooleanContext,
	isString,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-regexp-exec';
const messages = {
	[MESSAGE_ID]: 'Prefer `RegExp#exec()` over `String#match()`.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| (node.callee.computed && getStaticStringValue(node.callee.property) === undefined)
			|| getPropertyName(node.callee) !== 'match'
		) {
			return;
		}

		const stringNode = node.callee.object;
		const regexpNode = unwrapTypeScriptExpression(node.arguments[0]);
		// Treat `RegExp(...)` and `new RegExp(...)` as pure when their arguments are pure.
		const regexpExpressions = isCallOrNewExpression(regexpNode, {name: 'RegExp', optional: false})
			? regexpNode.arguments
			: [regexpNode];
		if (
			isBooleanContext(node, context)
			|| hasUnparenthesizedOptionalChainElement(stringNode, context)
			|| !isString(stringNode, context)
			|| regexpExpressions.some(expression => hasSideEffect(expression, context.sourceCode))
			|| getStaticRegExp(regexpNode, context)?.global !== false
		) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield node.callee.computed
					? replaceStringRaw(node.callee.property, 'exec', context, fixer)
					: fixer.replaceText(node.callee.property, 'exec');
				yield swapMethodCallObjectAndArgument(fixer, node, context);
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
			description: 'Prefer `RegExp#exec()` over `String#match()` for non-global regular expressions.',
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
