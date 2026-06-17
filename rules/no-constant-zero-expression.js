import {getStaticValue} from '@eslint-community/eslint-utils';
import {isLiteral} from './ast/index.js';

const MESSAGE_ID_ERROR = 'no-constant-zero-expression/error';
const MESSAGE_ID_SUGGESTION = 'no-constant-zero-expression/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'This operation always evaluates to `0` (or `-0`/`NaN`), which is likely a mistake.',
	[MESSAGE_ID_SUGGESTION]: 'Replace this expression with `0`.',
};

const isZero = node => isLiteral(node, 0);

/**
Check if a binary expression has a `0` operand that dominates the result.

`x * 0` / `0 * x` and `x & 0` / `0 & x` are dominated by a `0` on either side. `0 / x` is dominated only when the `0` is on the left, since `x / 0` is `Infinity`/`NaN`.

@param {import('estree').BinaryExpression} node
@returns {boolean}
*/
const isErasedToZero = node => {
	switch (node.operator) {
		case '*':
		case '&': {
			return isZero(node.left) || isZero(node.right);
		}

		case '/': {
			return isZero(node.left);
		}

		default: {
			return false;
		}
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		if (!isErasedToZero(node)) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
		};

		// Only suggest replacing with `0` when the whole expression provably folds to exactly `+0`.
		// `getStaticValue` resolves only side-effect-free constants, and `Object.is(…, 0)` excludes
		// `-0` (e.g. `-5 * 0`, `0 / -5`) and `NaN` (e.g. `0 / 0`), so those are reported without a suggestion.
		const staticValue = getStaticValue(node, sourceCode.getScope(node));
		if (
			staticValue
			&& Object.is(staticValue.value, 0)
			&& sourceCode.getCommentsInside(node).length === 0
		) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node, '0'),
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow arithmetic and bitwise operations that always evaluate to `0`.',
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
