import {isEmptyObjectExpression} from './ast/index.js';
import {
	getParenthesizedText,
	isParenthesized,
	shouldAddParenthesesToConditionalExpressionChild,
	shouldAddParenthesesToLogicalExpressionChild,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

const STYLE_LOGICAL = 'logical';
const STYLE_TERNARY = 'ternary';

const MESSAGE_ID = 'consistent-conditional-object-spread';
const messages = {
	[MESSAGE_ID]: 'Prefer {{expectedStyle}} conditional object spreads.',
};

const isObjectSpreadArgument = node => (
	node.parent.type === 'SpreadElement'
	&& node.parent.argument === node
	&& node.parent.parent.type === 'ObjectExpression'
	&& node.parent.parent.properties.includes(node.parent)
);

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

function getConditionalExpressionChildText(node, context) {
	let text = getParenthesizedText(node, context);

	if (
		!isParenthesized(node, context)
		&& shouldAddParenthesesToConditionalExpressionChild(node)
	) {
		text = `(${text})`;
	}

	return text;
}

function getConditionalExpressionProblem(conditionalExpression, context) {
	const {test, consequent, alternate} = conditionalExpression;
	const isAlternateEmpty = isEmptyObjectExpression(alternate);
	const isConsequentEmpty = isEmptyObjectExpression(consequent);

	if (isAlternateEmpty === isConsequentEmpty) {
		return;
	}

	const keptBranch = isAlternateEmpty ? consequent : alternate;
	const testText = isAlternateEmpty
		? getLogicalOperandText(test, 'left', context)
		: getNegatedTestText(test, context);
	const keptBranchText = getLogicalOperandText(keptBranch, 'right', context);

	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID,
		data: {
			expectedStyle: 'logical',
		},
		/** @param {import('eslint').Rule.RuleFixer} fixer */
		* fix(fixer, {abort}) {
			if (context.sourceCode.getCommentsInside(conditionalExpression).length > 0) {
				return abort();
			}

			yield fixer.replaceText(conditionalExpression, `${testText} && ${keptBranchText}`);
		},
	};
}

function getLogicalExpressionProblem(logicalExpression, context) {
	if (
		logicalExpression.operator !== '&&'
		|| isEmptyObjectExpression(logicalExpression.right)
	) {
		return;
	}

	const testText = getConditionalExpressionChildText(logicalExpression.left, context);
	const consequentText = getConditionalExpressionChildText(logicalExpression.right, context);

	return {
		node: logicalExpression,
		messageId: MESSAGE_ID,
		data: {
			expectedStyle: 'ternary',
		},
		/** @param {import('eslint').Rule.RuleFixer} fixer */
		* fix(fixer, {abort}) {
			if (context.sourceCode.getCommentsInside(logicalExpression).length > 0) {
				return abort();
			}

			yield fixer.replaceText(logicalExpression, `${testText} ? ${consequentText} : {}`);
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const style = context.options[0];

	if (style === STYLE_TERNARY) {
		context.on('LogicalExpression', logicalExpression => {
			if (!isObjectSpreadArgument(logicalExpression)) {
				return;
			}

			return getLogicalExpressionProblem(logicalExpression, context);
		});

		return;
	}

	context.on('ConditionalExpression', conditionalExpression => {
		if (!isObjectSpreadArgument(conditionalExpression)) {
			return;
		}

		return getConditionalExpressionProblem(conditionalExpression, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent conditional object spread style.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [
			{
				description: 'The conditional object spread style to enforce.',
				enum: [
					STYLE_LOGICAL,
					STYLE_TERNARY,
				],
			},
		],
		defaultOptions: [STYLE_LOGICAL],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
