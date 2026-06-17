import {isStringLiteral, isBooleanLiteral, isFunction} from './ast/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-accidental-bitwise-operator/error';
const MESSAGE_ID_SUGGESTION = 'no-accidental-bitwise-operator/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unexpected bitwise operator `{{bitwiseOperator}}`. Did you mean the logical operator `{{logicalOperator}}`?',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{bitwiseOperator}}` with `{{logicalOperator}}`.',
};

const logicalOperators = new Map([
	['&', '&&'],
	['|', '||'],
	['|=', '||='],
]);

// Value forms that make no sense as a bitwise operand, so the operator is almost
// certainly a mistyped logical operator. Intentionally excludes `null`, numeric
// literals, identifiers, and arithmetic expressions, which may be valid numbers.
const isDefinitelyNonNumeric = node =>
	node.type === 'ObjectExpression'
	|| node.type === 'ArrayExpression'
	|| node.type === 'ClassExpression'
	|| node.type === 'TemplateLiteral'
	|| isFunction(node)
	|| isStringLiteral(node)
	|| isBooleanLiteral(node);

// `obj & obj.prop` is a mistyped short-circuit guard (`obj && obj.prop`).
const isShortCircuitGuard = node =>
	node.operator === '&'
	&& node.left.type === 'Identifier'
	&& node.right.type === 'MemberExpression'
	&& node.right.object.type === 'Identifier'
	&& node.right.object.name === node.left.name;

// Either a mistyped short-circuit guard (`&`) or a mistyped logical fallback
// (`options | {}`, `input |= ''`), where the operator was almost certainly meant
// to be the logical counterpart.
const isSuspiciousBitwise = node =>
	isShortCircuitGuard(node)
	|| ((node.operator === '|' || node.operator === '|=') && isDefinitelyNonNumeric(node.right));

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on(['BinaryExpression', 'AssignmentExpression'], node => {
		if (!isSuspiciousBitwise(node)) {
			return;
		}

		const {operator} = node;
		const logicalOperator = logicalOperators.get(operator);
		const operatorToken = sourceCode.getTokenAfter(
			node.left,
			token => token.type === 'Punctuator' && token.value === operator,
		);

		return {
			node: operatorToken,
			messageId: MESSAGE_ID_ERROR,
			data: {bitwiseOperator: operator, logicalOperator},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {bitwiseOperator: operator, logicalOperator},
					/** @param {ESLint.Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(operatorToken, logicalOperator),
				},
			],
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow bitwise operators where a logical operator was likely intended.',
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
