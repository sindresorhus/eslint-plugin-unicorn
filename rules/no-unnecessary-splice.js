import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	MESSAGE_ID_EMPTY,
	MESSAGE_ID_NO_OP,
	MESSAGE_ID_POP,
	MESSAGE_ID_PUSH,
	MESSAGE_ID_SHIFT,
	MESSAGE_ID_UNSHIFT,
	getUnnecessarySpliceReplacement,
} from './shared/splice-replacements.js';
import {
	getParenthesizedText,
	hasOptionalChainElement,
	isValueNotUsable,
	unwrapTypeScriptExpression,
} from './utils/index.js';

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

function hasCommentsInside(node, sourceCode) {
	return sourceCode.getCommentsInside(node).length > 0;
}

function hasOptionalChainInComputedProperty(node) {
	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'MemberExpression') {
		return node.type === 'CallExpression' && hasOptionalChainInComputedProperty(node.callee);
	}

	return (node.computed && hasOptionalChainElement(node.property))
		|| hasOptionalChainInComputedProperty(node.object);
}

const isRemovableStatement = node =>
	node.parent.type === 'Program'
	|| node.parent.type === 'BlockStatement';

function hasCommentsOnSameLineAfter(node, sourceCode) {
	const [, nodeEnd] = sourceCode.getRange(node);
	const nodeEndLine = sourceCode.getLoc(node).end.line;

	return sourceCode.getAllComments().some(comment => {
		const [commentStart] = sourceCode.getRange(comment);
		const commentStartLine = sourceCode.getLoc(comment).start.line;

		return commentStart >= nodeEnd && commentStartLine === nodeEndLine;
	});
}

function getFix(callExpression, replacement, context) {
	if (!isValueNotUsable(callExpression) || hasCommentsInside(callExpression, context.sourceCode)) {
		return;
	}

	const {object} = callExpression.callee;

	if (replacement.messageId === MESSAGE_ID_NO_OP) {
		if (
			!isRemovableStatement(callExpression.parent)
			|| hasCommentsInside(callExpression.parent, context.sourceCode)
			|| hasCommentsOnSameLineAfter(callExpression.parent, context.sourceCode)
			|| hasSideEffect(object, context.sourceCode)
			|| callExpression.arguments.some(argument => hasSideEffect(argument, context.sourceCode))
		) {
			return;
		}

		return fixer => removeStatement(callExpression.parent, context, fixer);
	}

	const objectText = getParenthesizedText(object, context);
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

		const {object} = callExpression.callee;
		if (
			hasOptionalChainElement(object)
			|| hasOptionalChainInComputedProperty(object)
		) {
			return;
		}

		const replacement = getUnnecessarySpliceReplacement(callExpression);
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
