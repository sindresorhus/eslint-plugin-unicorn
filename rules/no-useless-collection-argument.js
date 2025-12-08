import {isParenthesized, getParenthesizedRange} from './utils/index.js';
import {
	isNewExpression,
	isEmptyArrayExpression,
	isEmptyStringLiteral,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {removeParentheses, removeArgument} from './fix/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-useless-collection-argument/error';
const MESSAGE_ID_SUGGESTION = 'no-useless-collection-argument/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'The {{description}} is useless.',
	[MESSAGE_ID_SUGGESTION]: 'Remove the {{description}}',
};

const getDescription = node => {
	if (isEmptyArrayExpression(node)) {
		return 'empty array';
	}

	if (isEmptyStringLiteral(node)) {
		return 'empty string';
	}

	if (isNullLiteral(node)) {
		return '`null`';
	}

	if (isUndefined(node)) {
		return '`undefined`';
	}
};

const removeFallback = (node, context) =>
	// Same code from rules/no-useless-fallback-in-spread.js
	/** @param {ESLint.Rule.RuleFixer} fixer */
	function * fix(fixer) {
		const {sourceCode} = context;
		const logicalExpression = node.parent;
		const {left} = logicalExpression;
		const isLeftObjectParenthesized = isParenthesized(left, context);
		const [, start] = isLeftObjectParenthesized
			? getParenthesizedRange(left, context)
			: sourceCode.getRange(left);
		const [, end] = sourceCode.getRange(logicalExpression);

		yield fixer.removeRange([start, end]);

		if (
			isLeftObjectParenthesized
			|| left.type !== 'SequenceExpression'
		) {
			yield removeParentheses(logicalExpression, fixer, context);
		}
	};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('NewExpression', (/** @type {ESTree.NewExpression} */ newExpression) => {
		if (!isNewExpression(newExpression, {
			names: ['Set', 'Map', 'WeakSet', 'WeakMap'],
			argumentsLength: 1,
		})) {
			return;
		}

		const [iterable] = newExpression.arguments;
		const isCheckingFallback = iterable.type === 'LogicalExpression' && iterable.operator === '??';
		const node = isCheckingFallback ? iterable.right : iterable;
		const description = getDescription(node);

		if (!description) {
			return;
		}

		let fix;
		let shouldUseSuggestion = false;
		if (isCheckingFallback) {
			fix = removeFallback(node, context);
		} else {
			if (context.sourceCode.getCommentsInside(node).length > 0) {
				shouldUseSuggestion = true;
			}

			fix = fixer => removeArgument(fixer, node, context);
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {description},
		};

		if (shouldUseSuggestion) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless values or fallbacks in `Set`, `Map`, `WeakSet`, or `WeakMap`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
