import {isSameReference} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-misrefactored-assignment/error';
const MESSAGE_ID_SUGGESTION = 'no-misrefactored-assignment/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: '`{{target}}` is duplicated in the right-hand side, which is likely a refactoring mistake.',
	[MESSAGE_ID_SUGGESTION]: 'Remove the duplicated `{{target}}`.',
};

// Compound assignment operators whose binary operator is commutative, so the
// target can be either operand: `a += a + b` and `a += b + a`.
const commutativeOperators = new Set(['+=', '*=', '&=', '|=', '^=']);

// All arithmetic and bitwise compound assignment operators. The logical ones
// (`&&=`, `||=`, `??=`) are intentionally excluded.
const compoundOperators = new Set([
	'+=',
	'-=',
	'*=',
	'/=',
	'%=',
	'**=',
	'&=',
	'|=',
	'^=',
	'<<=',
	'>>=',
	'>>>=',
]);

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('AssignmentExpression', node => {
		const {operator, left, right} = node;

		if (!compoundOperators.has(operator)) {
			return;
		}

		// `+=` -> `+`, `>>>=` -> `>>>`, etc.
		if (right.type !== 'BinaryExpression' || right.operator !== operator.slice(0, -1)) {
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

		// The fix replaces the whole right-hand side with the kept operand, so it
		// would drop any comments inside it. Skip the suggestion in that case.
		if (sourceCode.getCommentsInside(right).length === 0) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data,
					/** @param {ESLint.Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(right, sourceCode.getText(keptOperand)),
				},
			];
		}

		return problem;
	});
};

/** @type {ESLint.Rule.RuleModule} */
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
