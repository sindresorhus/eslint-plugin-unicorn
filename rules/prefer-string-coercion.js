import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isMethodCall} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getCallArgumentText,
	getCommentSafeProblem,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	hasOptionalChainElement,
	isBigInt,
	isNumber,
	withTypeInformation,
} from './utils/index.js';
import {createTypeCheckers, target, unknown} from './utils/type-helpers.js';

const MESSAGE_ID = 'prefer-string-coercion';
const SUGGESTION_ID = 'prefer-string-coercion/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `String()` over `.toString()` for decimal string conversion.',
	[SUGGESTION_ID]: 'Convert to a string with `String()`.',
};

const numericTypeNames = new Set(['number', 'bigint']);
const numericBinaryOperators = new Set(['-', '*', '/', '%', '**', '<<', '>>', '>>>', '&', '^', '|']);
const numericBuiltIns = new Set(['BigInt', 'Date', 'Math', 'Number']);

const {isTarget: isNumeric} = createTypeCheckers({
	targetTypeNames: numericTypeNames,
	targetCallNames: ['BigInt', 'Number', 'parseFloat', 'parseInt'],
	checkClassHeritage: false,
	isTargetNode(node, context, isNumeric) {
		if (node.type === 'BinaryExpression' || node.type === 'AssignmentExpression') {
			const operator = node.type === 'AssignmentExpression' ? node.operator.slice(0, -1) : node.operator;
			return numericBinaryOperators.has(operator)
				|| (operator === '+' && isNumeric(node.left) && isNumeric(node.right));
		}

		if (node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && ['+', '-', '~'].includes(node.operator))) {
			return true;
		}

		const member = node.type === 'CallExpression' ? node.callee : node;
		return (
			node.type === 'Identifier'
			|| (member.type === 'MemberExpression' && member.object.type === 'Identifier' && numericBuiltIns.has(member.object.name))
		) && (isNumber(node, context) || isBigInt(node, context));
	},
	getStaticType: value => numericTypeNames.has(typeof value) ? target : unknown,
	isTargetTypeAnnotation: node => node?.type === 'TSNumberKeyword'
		|| node?.type === 'TSBigIntKeyword'
		|| (node?.type === 'TSLiteralType' && numericTypeNames.has(typeof getPrimitiveLiteralValue(node.literal))),
	isTargetType: (type, checker) => type.isNumberLiteral() || numericTypeNames.has(checker.getBaseTypeOfLiteralType(type).intrinsicName),
});

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {argumentsLength: 0})) {
			return;
		}

		const {callee} = node;
		const method = callee.computed ? getStaticStringValue(callee.property) : getPropertyName(callee);
		const {object: value} = callee;
		if (
			method !== 'toString'
			|| hasOptionalChainElement(node)
			|| !isNumeric(value, context)
			|| withTypeInformation(node, context, ({type, checker}) => type !== checker.getStringType())
		) {
			return;
		}

		const problem = {node, messageId: MESSAGE_ID};
		const stringVariable = findVariable(context.sourceCode.getScope(node), 'String');
		// Even a type-only definition can obscure which value the replacement would use.
		if (stringVariable?.defs.length > 0) {
			return problem;
		}

		return getCommentSafeProblem(context, {
			...problem,
			suggest: [
				{
					messageId: SUGGESTION_ID,
					* fix(fixer) {
						yield fixer.replaceText(node, `String(${getCallArgumentText(value, context)})`);
						yield fixSpaceAroundKeyword(fixer, node, context);
					},
				},
			],
		}, node, [getParenthesizedRange(value, context)]);
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
			description: 'Prefer `String()` for decimal string conversion of numbers and BigInts.',
			recommended: false,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
