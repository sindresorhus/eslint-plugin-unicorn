import {
	isEmptyObjectExpression,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {
	getParenthesizedText,
	isParenthesized,
	isSameReference,
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
const nullishOperators = new Set(['==', '===']);
const nonNullishOperators = new Set(['!=', '!==']);

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

function isSameNode(left, right, sourceCode) {
	if (isSameReference(left, right)) {
		return true;
	}

	if (left.type !== right.type) {
		return false;
	}

	switch (left.type) {
		case 'AwaitExpression': {
			return isSameNode(left.argument, right.argument, sourceCode);
		}

		case 'LogicalExpression': {
			return (
				left.operator === right.operator
				&& isSameNode(left.left, right.left, sourceCode)
				&& isSameNode(left.right, right.right, sourceCode)
			);
		}

		case 'UnaryExpression': {
			return (
				left.operator === right.operator
				&& left.prefix === right.prefix
				&& isSameNode(left.argument, right.argument, sourceCode)
			);
		}

		case 'UpdateExpression': {
			return false;
		}

		// No default
	}

	return sourceCode.getText(left) === sourceCode.getText(right);
}

function getNullishKind(node) {
	if (isNullLiteral(node)) {
		return 'null';
	}

	if (isUndefined(node)) {
		return 'undefined';
	}
}

function getNullishBinaryCheck(node) {
	if (
		node.type !== 'BinaryExpression'
		|| (!nullishOperators.has(node.operator) && !nonNullishOperators.has(node.operator))
	) {
		return;
	}

	const leftKind = getNullishKind(node.left);
	const rightKind = getNullishKind(node.right);

	if (Boolean(leftKind) === Boolean(rightKind)) {
		return;
	}

	return {
		reference: leftKind ? node.right : node.left,
		kind: node.operator.length === 2 ? 'nullish' : (leftKind ?? rightKind),
		isTrueWhenNullish: nullishOperators.has(node.operator),
	};
}

const checksNullAndUndefined = (left, right) =>
	(left.kind === 'null' && right.kind === 'undefined')
	|| (left.kind === 'undefined' && right.kind === 'null');

function getNullishTest(node, sourceCode) {
	const binaryCheck = getNullishBinaryCheck(node);

	if (binaryCheck?.kind === 'nullish') {
		return binaryCheck;
	}

	if (node.type !== 'LogicalExpression') {
		return;
	}

	const left = getNullishBinaryCheck(node.left);
	const right = getNullishBinaryCheck(node.right);

	if (
		!left
		|| !right
		|| !isSameNode(left.reference, right.reference, sourceCode)
	) {
		return;
	}

	if (
		node.operator === '||'
		&& left.isTrueWhenNullish
		&& right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: true,
		};
	}

	if (
		node.operator === '&&'
		&& !left.isTrueWhenNullish
		&& !right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: false,
		};
	}
}

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
	const isAlternateEmpty = isEmptySpreadBranch(alternate);
	const isConsequentEmpty = isEmptySpreadBranch(consequent);

	if (isAlternateEmpty === isConsequentEmpty) {
		return;
	}

	const keptBranch = isAlternateEmpty ? consequent : alternate;
	const nullishTest = getNullishTest(test, context.sourceCode);
	const hasCommentsInside = context.sourceCode.getCommentsInside(conditionalExpression).length > 0;

	if (
		(
			isAlternateEmpty
				? isSameNode(test, keptBranch, context.sourceCode)
				: (
					test.type === 'UnaryExpression'
					&& test.operator === '!'
					&& test.prefix
					&& isSameNode(test.argument, keptBranch, context.sourceCode)
				)
		)
		|| (
			nullishTest
			&& !hasCommentsInside
			&& (nullishTest.isTrueWhenNullish ? !isAlternateEmpty : isAlternateEmpty)
			&& isSameNode(nullishTest.reference, keptBranch, context.sourceCode)
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
		/** @param {import('eslint').Rule.RuleFixer} fixer */
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

	if (isSameNode(logicalExpression.left, logicalExpression.right, context.sourceCode)) {
		return;
	}

	const nullishTest = getNullishTest(logicalExpression.left, context.sourceCode);

	if (
		nullishTest
		&& !nullishTest.isTrueWhenNullish
		&& isSameNode(nullishTest.reference, logicalExpression.right, context.sourceCode)
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
