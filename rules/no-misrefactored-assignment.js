import {getArithmeticOrBitwiseOperator} from './ast/index.js';
import {
	getParenthesizedRange,
	getPrecedence,
	isSameReference,
	PRECEDENCE_ADDITION,
	wouldRemoveComments,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-misrefactored-assignment/error';
const MESSAGE_ID_SUGGESTION = 'no-misrefactored-assignment/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: '`{{target}}` is duplicated in the right-hand side, which is likely a refactoring mistake.',
	[MESSAGE_ID_SUGGESTION]: 'Remove the duplicated `{{target}}`.',
};

// In a compound assignment with one of these operators, the target can be either operand: `a += a + b` and `a += b + a`.
const commutativeOperators = new Set(['+', '*', '&', '|', '^']);

/*
The kept operand replaces the whole `a + b` right-hand side, so its copied range must include surrounding parentheses when they are needed to keep its grouping.
*/
const getKeptOperandRange = (keptOperand, context) =>
	getPrecedence(keptOperand) < PRECEDENCE_ADDITION
		? getParenthesizedRange(keptOperand, context)
		: context.sourceCode.getRange(keptOperand);

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('AssignmentExpression', node => {
		const {left, right} = node;
		// Compare arithmetic and bitwise assignments with their binary operators: `+=` becomes `+` and `>>>=` becomes `>>>`. Logical assignments are excluded.
		const operator = getArithmeticOrBitwiseOperator(node);

		if (operator === undefined || right.type !== 'BinaryExpression' || right.operator !== operator) {
			return;
		}

		let keptOperand;
		if (isSameReference(left, right.left)) {
			keptOperand = right.right;
		} else if (commutativeOperators.has(operator) && isSameReference(left, right.right)) {
			keptOperand = right.left;
		} else {
			return;
		}

		const data = {target: sourceCode.getText(left)};

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data,
		};

		// The fix replaces the whole right-hand side with the kept operand, so it would drop comments outside the copied range. Skip the suggestion in that case.
		const keptRange = getKeptOperandRange(keptOperand, context);
		if (!wouldRemoveComments(context, right, [keptRange])) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data,
					/**
					@param {ESLint.Rule.RuleFixer} fixer
					*/
					fix: fixer => fixer.replaceText(right, sourceCode.text.slice(...keptRange)),
				},
			];
		}

		return problem;
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow misrefactored compound assignments where the target is duplicated in the right-hand side.',
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
