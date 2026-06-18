import {isBooleanLiteral} from './ast/index.js';
import replaceNodeWithExpression from './fix/replace-node-with-expression.js';
import {
	getParenthesizedText,
	isBoolean,
	isBooleanExpression,
	isControlFlowTest,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToLogicalExpressionChild,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-logical-operand';
const messages = {
	[MESSAGE_ID]: 'Simplify this `{{operator}}` expression.',
};

const identityByOperator = new Map([
	['&&', true],
	['||', false],
]);

const absorbingByOperator = new Map([
	['&&', false],
	['||', true],
]);

function isOutermostLogicalExpression(node) {
	return node.parent.type !== 'LogicalExpression'
		|| node.parent.operator !== node.operator;
}

function getLogicalOperands(node, operator) {
	if (
		node.type === 'LogicalExpression'
		&& node.operator === operator
	) {
		return [
			...getLogicalOperands(node.left, operator),
			...getLogicalOperands(node.right, operator),
		];
	}

	return [node];
}

function areKnownBooleanOperands(operands, context) {
	return operands.every(operand => isBoolean(operand, context));
}

function isBooleanContext(node, context) {
	return isBooleanExpression(node, context) || isControlFlowTest(node);
}

function isRemovableIdentityOperand(operands, index, context) {
	if (index === 0 || index < operands.length - 1) {
		return true;
	}

	const remainingOperands = operands.slice(0, -1);
	return isBooleanContext(operands[index].parent, context) || areKnownBooleanOperands(remainingOperands, context);
}

function getLeadingAbsorbingOperand(operands, operator) {
	const absorbingValue = absorbingByOperator.get(operator);
	return isBooleanLiteral(operands[0], absorbingValue) ? operands[0] : undefined;
}

function getRemovableIdentityOperands(operands, operator, context) {
	const identityValue = identityByOperator.get(operator);

	return operands.filter((operand, index) =>
		isBooleanLiteral(operand, identityValue)
		&& isRemovableIdentityOperand(operands, index, context),
	);
}

function needsLeadingOperandParentheses(operand, text) {
	return operand.type === 'FunctionExpression'
		|| operand.type === 'ClassExpression'
		|| text.startsWith('{');
}

function getOperandText(operand, operator, index, context) {
	let text = getParenthesizedText(operand, context);

	if (
		!isParenthesized(operand, context)
		&& shouldAddParenthesesToLogicalExpressionChild(operand, {
			operator,
			property: index === 0 ? 'left' : 'right',
		})
	) {
		text = `(${text})`;
	}

	if (
		index === 0
		&& needsLeadingOperandParentheses(operand, text)
	) {
		text = `(${text})`;
	}

	return text;
}

function getReplacementText(node, replacementOperands, operator, context) {
	const replacement = replacementOperands
		.map((operand, index) => getOperandText(operand, operator, index, context))
		.join(` ${operator} `);

	return needsSemicolon(context.sourceCode.getTokenBefore(node), context, replacement)
		? `;${replacement}`
		: replacement;
}

function getProblem(node, context) {
	const {operator} = node;
	const operands = getLogicalOperands(node, operator);
	const leadingAbsorbingOperand = getLeadingAbsorbingOperand(operands, operator);

	if (leadingAbsorbingOperand) {
		return {
			target: leadingAbsorbingOperand,
			replacementOperands: [leadingAbsorbingOperand],
		};
	}

	const removableOperands = getRemovableIdentityOperands(operands, operator, context);
	if (removableOperands.length === 0) {
		return;
	}

	const replacementOperands = operands.filter(operand => !removableOperands.includes(operand));

	return {
		target: removableOperands[0],
		replacementOperands: replacementOperands.length === 0 ? [removableOperands.at(-1)] : replacementOperands,
	};
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('LogicalExpression', node => {
		if (
			!identityByOperator.has(node.operator)
			|| !isOutermostLogicalExpression(node)
		) {
			return;
		}

		const problem = getProblem(node, context);
		if (!problem) {
			return;
		}

		const {target, replacementOperands} = problem;
		const report = {
			node: target,
			messageId: MESSAGE_ID,
			data: {
				operator: node.operator,
			},
		};

		if (context.sourceCode.getCommentsInside(node).length > 0) {
			return report;
		}

		if (replacementOperands.length === 1) {
			report.fix = fixer => replaceNodeWithExpression(fixer, node, replacementOperands[0], context);
			return report;
		}

		report.fix = fixer => fixer.replaceText(
			node,
			getReplacementText(node, replacementOperands, node.operator, context),
		);

		return report;
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary operands in logical expressions involving boolean literals.',
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
