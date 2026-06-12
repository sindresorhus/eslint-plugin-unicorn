import {findVariable} from '@eslint-community/eslint-utils';
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
	[MESSAGE_ID]: 'Prefer `Math.abs()` to simplify this expression.',
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

function isBigIntTypeAnnotation(typeAnnotation) {
	return typeAnnotation.type === 'TSBigIntKeyword'
		|| (
			typeAnnotation.type === 'TSLiteralType'
			&& isBigIntLiteral(typeAnnotation.literal)
		)
		|| (
			typeAnnotation.type === 'TSTypeAnnotation'
			&& isBigIntTypeAnnotation(typeAnnotation.typeAnnotation)
		)
		|| (
			typeAnnotation.type === 'TSUnionType'
			&& typeAnnotation.types.some(type => isBigIntTypeAnnotation(type))
		)
		|| (
			typeAnnotation.type === 'TSIntersectionType'
			&& typeAnnotation.types.some(type => isBigIntTypeAnnotation(type))
		);
}

function unwrapTypeScriptExpression(node) {
	if (
		[
			'TSAsExpression',
			'TSTypeAssertion',
			'TSNonNullExpression',
		].includes(node.type)
	) {
		return unwrapTypeScriptExpression(node.expression);
	}

	return node;
}

function getTypeAnnotation(node) {
	if (node.type === 'TSNonNullExpression') {
		return getTypeAnnotation(node.expression);
	}

	if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
		return node.typeAnnotation;
	}
}

function hasBigIntTypeAnnotation(node) {
	const typeAnnotation = getTypeAnnotation(node);
	return typeAnnotation && isBigIntTypeAnnotation(typeAnnotation);
}

function isBigIntExpression(node) {
	return isBigIntLiteral(node)
		|| isCallExpression(node, {
			name: 'BigInt',
			argumentsLength: 1,
			optional: false,
		})
		|| (
			node.type === 'UnaryExpression'
			&& node.operator === '-'
			&& isBigIntExpression(node.argument)
		)
		|| hasBigIntTypeAnnotation(node);
}

function hasBigIntDefinition(node, context) {
	const expressionNode = unwrapTypeScriptExpression(node);

	if (expressionNode.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(expressionNode), expressionNode);

	return variable?.defs.some(definition => {
		if (definition.type === 'Parameter') {
			return (
				definition.name.typeAnnotation
				&& isBigIntTypeAnnotation(definition.name.typeAnnotation)
			) || (
				definition.name.parent.type === 'AssignmentPattern'
				&& isBigIntExpression(definition.name.parent.right)
			);
		}

		if (definition.type === 'Variable') {
			return (
				definition.node.id.typeAnnotation
				&& isBigIntTypeAnnotation(definition.node.id.typeAnnotation)
			) || (
				definition.node.init
				&& isBigIntExpression(definition.node.init)
			);
		}

		return false;
	}) ?? false;
}

function isBigInt(node, context) {
	return isBigIntExpression(node)
		|| hasBigIntDefinition(node, context);
}

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

function getComparisonWithZero(node, context) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left, context)
		|| isBigInt(node.right, context)
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

function getGreaterComparison(node, context) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left, context)
		|| isBigInt(node.right, context)
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

function getLessComparison(node, context) {
	if (
		node.type !== 'BinaryExpression'
		|| !operators.has(node.operator)
		|| isBigInt(node.left, context)
		|| isBigInt(node.right, context)
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

function hasCommentsInside(node, context) {
	return context.sourceCode.getCommentsInside(node).length > 0;
}

function createProblem(node, context, fix) {
	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	if (fix && !hasCommentsInside(node, context)) {
		problem.fix = fix;
	}

	return problem;
}

function isSideEffectFreeReference(node) {
	node = unwrapTypeScriptExpression(node);

	return [
		'Identifier',
		'Literal',
		'ThisExpression',
	].includes(node.type);
}

function getTernaryReplacement(conditionalExpression, context) {
	const comparison = getComparisonWithZero(conditionalExpression.test, context);
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

function getLogicalExpressionReplacement(logicalExpression, context) {
	if (logicalExpression.operator !== '||') {
		return;
	}

	const leftGreaterComparison = getGreaterComparison(logicalExpression.left, context);
	const rightLessComparison = getLessComparison(logicalExpression.right, context);

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

	const rightGreaterComparison = getGreaterComparison(logicalExpression.right, context);
	const leftLessComparison = getLessComparison(logicalExpression.left, context);

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
		const value = getTernaryReplacement(conditionalExpression, context);

		if (!value) {
			return;
		}

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = isSideEffectFreeReference(value)
			? function * (fixer) {
				yield fixSpaceAroundKeyword(fixer, conditionalExpression, context);
				yield fixer.replaceText(conditionalExpression, `Math.abs(${getAbsoluteValueText(value, context)})`);
			}
			: undefined;

		return createProblem(conditionalExpression, context, fix);
	});

	context.on('LogicalExpression', logicalExpression => {
		const replacement = getLogicalExpressionReplacement(logicalExpression, context);

		if (!replacement) {
			return;
		}

		const {value, threshold, operator} = replacement;

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = (
			isSideEffectFreeReference(value)
			&& isSideEffectFreeReference(threshold)
		)
			? function * (fixer) {
				yield fixSpaceAroundKeyword(fixer, logicalExpression, context);
				yield fixer.replaceText(logicalExpression, `Math.abs(${getAbsoluteValueText(value, context)}) ${operator} ${getParenthesizedText(threshold, context)}`);
			}
			: undefined;

		return createProblem(logicalExpression, context, fix);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Math.abs()` over manual absolute value expressions and symmetric range checks.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
