import {
	isBigIntLiteral,
	isCallExpression,
	isLiteral,
	isNegativeOne,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {getParenthesizedText, isSameReference} from './utils/index.js';

const MESSAGE_ID = 'prefer-math-abs';
const messages = {
	[MESSAGE_ID]: 'Prefer `Math.abs()` to simplify absolute value expressions.',
};

const operators = new Set(['>', '>=', '<', '<=']);
const invertedOperator = {
	'>': '<',
	'>=': '<=',
	'<': '>',
	'<=': '>=',
};

const matchingOperator = {
	'>': '<',
	'>=': '<=',
};

const isZero = node => isLiteral(node, 0);

const isBigInt = node =>
	isBigIntLiteral(node)
	|| isCallExpression(node, {
		name: 'BigInt',
		argumentsLength: 1,
		optional: false,
	})
	|| (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& isBigInt(node.argument)
	);

function isNegativeExpression(node, valueNode) {
	if (
		node.type === 'UnaryExpression'
		&& node.operator === '-'
	) {
		return isSameReference(node.argument, valueNode);
	}

	if (
		node.type === 'BinaryExpression'
		&& node.operator === '-'
		&& isZero(node.left)
	) {
		return isSameReference(node.right, valueNode);
	}

	if (
		node.type === 'BinaryExpression'
		&& node.operator === '*'
	) {
		return (
			isSameReference(node.left, valueNode)
			&& isNegativeOne(node.right)
		) || (
			isNegativeOne(node.left)
			&& isSameReference(node.right, valueNode)
		);
	}

	return false;
}

function getComparisonWithZero(node) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left)
		|| isBigInt(node.right)
	) {
		return;
	}

	if (isZero(node.right)) {
		return {
			value: node.left,
			operator: node.operator,
		};
	}

	if (isZero(node.left)) {
		return {
			value: node.right,
			operator: invertedOperator[node.operator],
		};
	}
}

function getGreaterComparison(node) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left)
		|| isBigInt(node.right)
	) {
		return;
	}

	if (node.operator === '>' || node.operator === '>=') {
		return {
			value: node.left,
			threshold: node.right,
			operator: node.operator,
		};
	}

	return {
		value: node.right,
		threshold: node.left,
		operator: invertedOperator[node.operator],
	};
}

function getLessComparison(node) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left)
		|| isBigInt(node.right)
	) {
		return;
	}

	if (node.operator === '<' || node.operator === '<=') {
		return {
			value: node.left,
			negativeThreshold: node.right,
			operator: node.operator,
		};
	}

	return {
		value: node.right,
		negativeThreshold: node.left,
		operator: invertedOperator[node.operator],
	};
}

function getAbsoluteValueText(node, context) {
	const text = getParenthesizedText(node, context);
	return node.type === 'SequenceExpression' ? `(${text})` : text;
}

function getTernaryReplacement(conditionalExpression) {
	const comparison = getComparisonWithZero(conditionalExpression.test);
	if (!comparison) {
		return;
	}

	const {value, operator} = comparison;
	const {consequent, alternate} = conditionalExpression;

	if (
		(operator === '<' || operator === '<=')
		&& isNegativeExpression(consequent, value)
		&& isSameReference(alternate, value)
	) {
		return value;
	}

	if (
		(operator === '>' || operator === '>=')
		&& isSameReference(consequent, value)
		&& isNegativeExpression(alternate, value)
	) {
		return value;
	}
}

function getLogicalExpressionReplacement(logicalExpression) {
	if (logicalExpression.operator !== '||') {
		return;
	}

	const leftGreaterComparison = getGreaterComparison(logicalExpression.left);
	const rightLessComparison = getLessComparison(logicalExpression.right);

	if (
		leftGreaterComparison
		&& rightLessComparison
		&& isSameReference(leftGreaterComparison.value, rightLessComparison.value)
		&& matchingOperator[leftGreaterComparison.operator] === rightLessComparison.operator
		&& isNegativeExpression(rightLessComparison.negativeThreshold, leftGreaterComparison.threshold)
	) {
		return {
			value: leftGreaterComparison.value,
			threshold: leftGreaterComparison.threshold,
			operator: leftGreaterComparison.operator,
		};
	}

	const rightGreaterComparison = getGreaterComparison(logicalExpression.right);
	const leftLessComparison = getLessComparison(logicalExpression.left);

	if (
		rightGreaterComparison
		&& leftLessComparison
		&& isSameReference(rightGreaterComparison.value, leftLessComparison.value)
		&& matchingOperator[rightGreaterComparison.operator] === leftLessComparison.operator
		&& isNegativeExpression(leftLessComparison.negativeThreshold, rightGreaterComparison.threshold)
	) {
		return {
			value: rightGreaterComparison.value,
			threshold: rightGreaterComparison.threshold,
			operator: rightGreaterComparison.operator,
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ConditionalExpression', conditionalExpression => {
		const value = getTernaryReplacement(conditionalExpression);

		if (!value) {
			return;
		}

		return {
			node: conditionalExpression,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixSpaceAroundKeyword(fixer, conditionalExpression, context);
				yield fixer.replaceText(conditionalExpression, `Math.abs(${getAbsoluteValueText(value, context)})`);
			},
		};
	});

	context.on('LogicalExpression', logicalExpression => {
		const replacement = getLogicalExpressionReplacement(logicalExpression);

		if (!replacement) {
			return;
		}

		const {value, threshold, operator} = replacement;

		return {
			node: logicalExpression,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixSpaceAroundKeyword(fixer, logicalExpression, context);
				yield fixer.replaceText(logicalExpression, `Math.abs(${getAbsoluteValueText(value, context)}) ${operator} ${getParenthesizedText(threshold, context)}`);
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
			description: 'Prefer `Math.abs()` over manual absolute value expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
