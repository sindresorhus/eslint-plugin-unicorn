import {isParenthesized, getParenthesizedRange} from './utils/index.js';
import {
	isNewExpression,
	isEmptyArrayExpression,
	isEmptyStringLiteral,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {removeParentheses, removeArgument} from './fix/index.js';

const MESSAGE_ID = 'no-useless-collection-argument';
const messages = {
	[MESSAGE_ID]: 'The {{description}} is useless.',
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
	/** @param {import('eslint').Rule.RuleFixer} fixer */
	function * fix(fixer) {
		const {sourceCode} = context;
		const logicalExpression = node.parent;
		const {left} = logicalExpression;
		const isLeftObjectParenthesized = isParenthesized(left, sourceCode);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	NewExpression(newExpression) {
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

		return {
			node,
			messageId: MESSAGE_ID,
			data: {description},
			fix: isCheckingFallback
				? removeFallback(node, context)
				: fixer => removeArgument(fixer, node, context),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless values or fallbacks in `Set`, `Map`, `WeakSet`, or `WeakMap`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
