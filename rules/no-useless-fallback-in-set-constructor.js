import {isParenthesized, getParenthesizedRange} from './utils/index.js';
import {isNewExpression, isEmptyArrayExpression, isEmptyStringLiteral} from './ast/index.js';
import {removeParentheses} from './fix/index.js';

const MESSAGE_ID = 'no-useless-fallback-in-set-constructor';
const messages = {
	[MESSAGE_ID]: 'The {{description}} is useless.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	NewExpression(newExpression) {
		if (!isNewExpression(newExpression, {name: 'Set', argumentsLength: 1})) {
			return;
		}

		const [iterable] = newExpression.arguments;

		if (!(
			iterable.type === 'LogicalExpression'
			&& iterable.operator === '??'
		)) {
			return;
		}

		const {right: fallback} = iterable;

		let description;
		if (isEmptyArrayExpression(fallback)) {
			description = 'empty array';
		} else if (isEmptyStringLiteral(fallback)) {
			description = 'empty string';
		}	else {
			return;
		}

		return {
			node: fallback,
			messageId: MESSAGE_ID,
			data: {description},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;
				const {left} = iterable;
				const isLeftObjectParenthesized = isParenthesized(left, sourceCode);
				const [, start] = isLeftObjectParenthesized
					? getParenthesizedRange(left, sourceCode)
					: sourceCode.getRange(left);
				const [, end] = sourceCode.getRange(iterable);

				yield fixer.removeRange([start, end]);

				if (
					isLeftObjectParenthesized
					|| left.type !== 'SequenceExpression'
				) {
					yield * removeParentheses(iterable, fixer, sourceCode);
				}
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless fallback when creating a `Set`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
