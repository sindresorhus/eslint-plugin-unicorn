import {replaceNodeWithExpression} from './fix/index.js';
import {
	getParenthesizedText,
	isBoolean,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-boolean-comparison';
const messages = {
	[MESSAGE_ID]: 'Do not compare a boolean expression against a boolean literal.',
};

const strictEqualityOperators = new Set(['===', '!==']);

const isBooleanLiteral = node =>
	node.type === 'Literal'
	&& typeof node.value === 'boolean';

function getBooleanComparison(node) {
	if (!strictEqualityOperators.has(node.operator)) {
		return;
	}

	const isLeftBooleanLiteral = isBooleanLiteral(node.left);
	const isRightBooleanLiteral = isBooleanLiteral(node.right);

	if (isLeftBooleanLiteral === isRightBooleanLiteral) {
		return;
	}

	return isLeftBooleanLiteral
		? {expression: node.right, literal: node.left}
		: {expression: node.left, literal: node.right};
}

const shouldNegateExpression = (operator, literal) =>
	operator === '===' ? literal.value === false : literal.value === true;

const isSafeKnownBooleanExpression = (node, context) =>
	node.type !== 'YieldExpression'
	&& isBoolean(node, context);

function getNegatedExpressionText(node, context) {
	const {sourceCode} = context;
	let text = getParenthesizedText(node, context);

	if (
		shouldAddParenthesesToUnaryExpressionArgument(node, '!')
		&& !isParenthesized(node, context)
	) {
		text = `(${text})`;
	}

	if (needsSemicolon(sourceCode.getTokenBefore(node.parent), context, `!${text}`)) {
		return `;!${text}`;
	}

	return `!${text}`;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		const booleanComparison = getBooleanComparison(node);
		if (!booleanComparison) {
			return;
		}

		const {expression, literal} = booleanComparison;
		if (!isSafeKnownBooleanExpression(expression, context)) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		return {
			...problem,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix(fixer) {
				if (shouldNegateExpression(node.operator, literal)) {
					return fixer.replaceText(node, getNegatedExpressionText(expression, context));
				}

				return replaceNodeWithExpression(fixer, node, expression, context);
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
			description: 'Disallow unnecessary comparisons against boolean literals.',
			recommended: 'unopinionated',
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
