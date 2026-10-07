import {
	isEmptyObjectExpression,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {
	getConditionalExpressionChildText,
	getLogicalExpressionChildText,
	getNegatedExpressionText,
	isGlobalBooleanCall,
} from './utils/index.js';
import {getNullishTest, isSameNode} from './shared/nullish-check.js';

const STYLE_LOGICAL = 'logical';
const STYLE_TERNARY = 'ternary';

const MESSAGE_ID = 'consistent-conditional-object-spread';
const MESSAGE_ID_BOOLEAN_CAST = 'unnecessary-boolean-cast';
const messages = {
	[MESSAGE_ID]: 'Prefer {{expectedStyle}} conditional object spreads.',
	[MESSAGE_ID_BOOLEAN_CAST]: 'Unnecessary boolean cast. A falsy value spreads nothing.',
};

// `{...{}}`, `{...undefined}`, and `{...null}` all spread nothing.
const isEmptySpreadBranch = node =>
	isEmptyObjectExpression(node)
	|| isUndefined(node)
	|| isNullLiteral(node);

const isObjectSpreadArgument = node => (
	node.parent.type === 'SpreadElement'
	&& node.parent.argument === node
	&& node.parent.parent.type === 'ObjectExpression'
	&& node.parent.parent.properties.includes(node.parent)
);

// Render `node` as an operand of a `&&` expression, adding parentheses when precedence requires it.
const getLogicalOperandText = (node, property, context) => getLogicalExpressionChildText(node, context, {operator: '&&', property});

// Render `!test` as the left operand of a `&&` expression, stripping a leading `!` when present.
function getNegatedTestText(test, context) {
	if (
		test.type === 'UnaryExpression'
		&& test.operator === '!'
		&& test.prefix
	) {
		return getLogicalOperandText(test.argument, 'left', context);
	}

	return getNegatedExpressionText(test, context);
}

function getConditionalExpressionProblem(conditionalExpression, context) {
	const {test, consequent, alternate} = conditionalExpression;
	const isAlternateEmpty = isEmptySpreadBranch(alternate);
	const isConsequentEmpty = isEmptySpreadBranch(consequent);

	if (isAlternateEmpty === isConsequentEmpty) {
		return;
	}

	const keptBranch = isAlternateEmpty ? consequent : alternate;
	const nullishTest = getNullishTest(test, context);
	const hasCommentsInside = context.sourceCode.getCommentsInside(conditionalExpression).length > 0;

	if (
		(
			isAlternateEmpty
				? isSameNode(test, keptBranch, context)
				: (
					test.type === 'UnaryExpression'
					&& test.operator === '!'
					&& test.prefix
					&& isSameNode(test.argument, keptBranch, context)
				)
		)
		|| (
			nullishTest
			&& (nullishTest.isTrueWhenNullish ? !isAlternateEmpty : isAlternateEmpty)
			&& isSameNode(nullishTest.reference, keptBranch, context)
		)
	) {
		return;
	}

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
		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			if (hasCommentsInside) {
				return abort();
			}

			yield fixer.replaceText(conditionalExpression, `${testText} && ${keptBranchText}`);
		},
	};
}

function getLogicalExpressionProblem(logicalExpression, context) {
	if (
		logicalExpression.operator !== '&&'
		|| isEmptySpreadBranch(logicalExpression.right)
	) {
		return;
	}

	if (isSameNode(logicalExpression.left, logicalExpression.right, context)) {
		return;
	}

	const nullishTest = getNullishTest(logicalExpression.left, context);

	if (
		nullishTest
		&& !nullishTest.isTrueWhenNullish
		&& isSameNode(nullishTest.reference, logicalExpression.right, context)
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
		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			if (context.sourceCode.getCommentsInside(logicalExpression).length > 0) {
				return abort();
			}

			yield fixer.replaceText(logicalExpression, `${testText} ? ${consequentText} : {}`);
		},
	};
}

// Get `foo` from `!!foo` or `Boolean(foo)`.
function getBooleanCastArgument(node, context) {
	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
		&& node.argument.type === 'UnaryExpression'
		&& node.argument.operator === '!'
	) {
		return node.argument.argument;
	}

	if (isGlobalBooleanCall(node, context)) {
		return node.arguments[0];
	}
}

// `{...(!!foo && bar)}` equals `{...(foo && bar)}` because every falsy value spreads nothing.
function getBooleanCastProblem(booleanCast, property, context) {
	const castArgument = getBooleanCastArgument(booleanCast, context);

	if (!castArgument) {
		return;
	}

	return {
		node: booleanCast,
		messageId: MESSAGE_ID_BOOLEAN_CAST,
		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			if (context.sourceCode.getCommentsInside(booleanCast).length > 0) {
				return abort();
			}

			yield fixer.replaceText(booleanCast, getLogicalOperandText(castArgument, property, context));
		},
	};
}

// In `{...(a && b && c)}`, the result is `a` or `b` only when that operand is falsy, so a boolean cast of it is unnecessary.
function * getBooleanCastProblems(logicalExpression, context) {
	if (logicalExpression.operator !== '&&') {
		return;
	}

	let node = logicalExpression.left;

	while (node.type === 'LogicalExpression' && node.operator === '&&') {
		yield getBooleanCastProblem(node.right, 'right', context);
		node = node.left;
	}

	yield getBooleanCastProblem(node, 'left', context);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

	context.on('LogicalExpression', logicalExpression => {
		if (!isObjectSpreadArgument(logicalExpression)) {
			return;
		}

		return getBooleanCastProblems(logicalExpression, context);
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
			description: 'Enforce consistent conditional object spread style.',
			recommended: true,
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
