import {getStaticValue} from '@eslint-community/eslint-utils';
import {isLiteral} from './ast/index.js';
import {getParenthesizedText, isNumber} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-subtraction-comparison/error';
const MESSAGE_ID_SUGGESTION = 'no-subtraction-comparison/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer comparing the values directly over comparing the difference with `0`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

// When the `0` is on the left, the comparison is mirrored, so the operator flips.
// The equality operators are symmetric, so they map to themselves.
const invertedOperator = {
	'>': '<',
	'>=': '<=',
	'<': '>',
	'<=': '>=',
	'===': '===',
	'!==': '!==',
	'==': '==',
	'!=': '!=',
};

const operators = new Set(Object.keys(invertedOperator));
const strictOrderingOperators = new Set(['>', '<']);

const isZero = node => isLiteral(node, 0);
const isSubtraction = node => node.type === 'BinaryExpression' && node.operator === '-';
const isFiniteStaticNumber = (node, scope) => {
	const value = getStaticValue(node, scope)?.value;
	return typeof value === 'number' && Number.isFinite(value);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		if (!operators.has(node.operator)) {
			return;
		}

		let subtraction;
		let operator;
		if (isZero(node.right) && isSubtraction(node.left)) {
			subtraction = node.left;
			operator = node.operator;
		} else if (isZero(node.left) && isSubtraction(node.right)) {
			subtraction = node.right;
			operator = invertedOperator[node.operator];
		} else {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
		};

		// Keep comments intact by not offering a fix when there are any inside the expression.
		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		const {left, right} = subtraction;
		const replacement = `${getParenthesizedText(left, context)} ${operator} ${getParenthesizedText(right, context)}`;

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => fixer.replaceText(node, replacement);

		const scope = sourceCode.getScope(node);
		const canAutofix = strictOrderingOperators.has(operator)
			? isNumber(left, scope) && isNumber(right, scope)
			: isFiniteStaticNumber(left, scope) && isFiniteStaticNumber(right, scope);

		if (canAutofix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {replacement},
					fix,
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer comparing values directly over subtracting and comparing to `0`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
