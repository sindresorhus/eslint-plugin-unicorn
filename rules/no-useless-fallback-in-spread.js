import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	isSameReference,
	shouldAddParenthesesToLogicalExpressionChild,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';
import {removeParentheses} from './fix/index.js';
import {isEmptyObjectExpression} from './ast/index.js';

const MESSAGE_ID = 'no-useless-fallback-in-spread';
const messages = {
	[MESSAGE_ID]: 'The empty object is useless.',
};

// Render `node` as an operand of a `&&` expression, adding parentheses when precedence requires it.
function getLogicalOperandText(node, property, context) {
	let text = getParenthesizedText(node, context);

	if (
		!isParenthesized(node, context)
		&& shouldAddParenthesesToLogicalExpressionChild(node, {operator: '&&', property})
	) {
		text = `(${text})`;
	}

	return text;
}

// Render `!test` as the left operand of a `&&` expression, stripping a leading `!` when present.
function getNegatedTestText(test, context) {
	if (
		test.type === 'UnaryExpression'
		&& test.operator === '!'
		&& test.prefix
	) {
		return getLogicalOperandText(test.argument, 'left', context);
	}

	let text = getParenthesizedText(test, context);

	if (
		!isParenthesized(test, context)
		&& shouldAddParenthesesToUnaryExpressionArgument(test, '!')
	) {
		text = `(${text})`;
	}

	return `!${text}`;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// `{...(foo || {})}`, `{...(foo ?? {})}`
	context.on('ObjectExpression', node => {
		if (!(
			isEmptyObjectExpression(node)
			&& node.parent.type === 'LogicalExpression'
			&& node.parent.right === node
			&& (node.parent.operator === '||' || node.parent.operator === '??')
			&& node.parent.parent.type === 'SpreadElement'
			&& node.parent.parent.argument === node.parent
			&& node.parent.parent.parent.type === 'ObjectExpression'
			&& node.parent.parent.parent.properties.includes(node.parent.parent)
		)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
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
			},
		};
	});

	// `{...(foo ? {bar: true} : {})}`, `{...(foo ? {} : {bar: true})}`
	context.on('ConditionalExpression', conditionalExpression => {
		const {test, consequent, alternate, parent} = conditionalExpression;

		if (!(
			parent.type === 'SpreadElement'
			&& parent.argument === conditionalExpression
			&& parent.parent.type === 'ObjectExpression'
			&& parent.parent.properties.includes(parent)
		)) {
			return;
		}

		const isAlternateEmpty = isEmptyObjectExpression(alternate);
		const isConsequentEmpty = isEmptyObjectExpression(consequent);

		// Exactly one branch must be an empty object.
		if (isAlternateEmpty === isConsequentEmpty) {
			return;
		}

		const emptyObject = isAlternateEmpty ? alternate : consequent;
		const keptBranch = isAlternateEmpty ? consequent : alternate;

		// `{...(foo ? foo : {})}` and `{...(!foo ? {} : foo)}` are handled by `prefer-logical-operator-over-ternary`.
		if (
			isAlternateEmpty
				? isSameReference(test, keptBranch)
				: (
					test.type === 'UnaryExpression'
					&& test.operator === '!'
					&& test.prefix
					&& isSameReference(test.argument, keptBranch)
				)
		) {
			return;
		}

		return {
			node: emptyObject,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer, {abort}) {
				// Don't drop comments around `?`/`:`.
				if (context.sourceCode.getCommentsInside(conditionalExpression).length > 0) {
					return abort();
				}

				const leftText = isAlternateEmpty
					? getLogicalOperandText(test, 'left', context)
					: getNegatedTestText(test, context);
				const rightText = getLogicalOperandText(keptBranch, 'right', context);

				yield fixer.replaceText(conditionalExpression, `${leftText} && ${rightText}`);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless fallback when spreading in object literals.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
