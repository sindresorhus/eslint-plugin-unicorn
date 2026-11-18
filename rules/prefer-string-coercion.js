import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {
	getArithmeticOrBitwiseOperator,
	getStaticStringValue,
	isMethodCall,
	isNumericUnaryOperator,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getCallArgumentText,
	getCommentSafeProblem,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	getStaticValueForControlFlow,
	hasOptionalChainElement,
	isBigInt,
	isNumber,
	withTypeInformation,
} from './utils/index.js';
import {
	createTypeCheckers,
	hasJSDocumentTypeReference,
	target,
	unknown,
} from './utils/type-helpers.js';

const MESSAGE_ID = 'prefer-string-coercion';
const messages = {
	[MESSAGE_ID]: 'Prefer `String()` over `.toString()` for decimal string conversion.',
};

const numericTypeNames = new Set(['number', 'bigint']);
const numericBuiltIns = new Set(['BigInt', 'Date', 'Math', 'Number']);

const {isTarget: isNumeric} = createTypeCheckers({
	targetTypeNames: numericTypeNames,
	targetCallNames: ['BigInt', 'Number', 'parseFloat', 'parseInt'],
	checkClassHeritage: false,
	ignoreReassignedJSDocumentBindings: true,
	isTargetNode(node, context, isNumeric) {
		const operator = getArithmeticOrBitwiseOperator(node);
		if (operator !== undefined) {
			return operator !== '+' || (isNumeric(node.left) && isNumeric(node.right));
		}

		if (node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && isNumericUnaryOperator(node.operator))) {
			return true;
		}

		if (node.type === 'Identifier') {
			// The shared checker handles local bindings. Guard static evaluation of globals such as `NaN` and aliases of them.
			return numericTypeNames.has(typeof getStaticValueForControlFlow(node, context)?.value)
				&& !hasJSDocumentTypeReference(node, context);
		}

		const member = node.type === 'CallExpression' ? node.callee : node;
		return member.type === 'MemberExpression'
			&& member.object.type === 'Identifier'
			&& numericBuiltIns.has(member.object.name)
			&& (isNumber(node, context) || isBigInt(node, context));
	},
	getStaticType: value => numericTypeNames.has(typeof value) ? target : unknown,
	isTargetTypeAnnotation: node => node?.type === 'TSNumberKeyword'
		|| node?.type === 'TSBigIntKeyword'
		|| (node?.type === 'TSLiteralType' && numericTypeNames.has(typeof getPrimitiveLiteralValue(node.literal))),
	isTargetType: (type, checker) => type.intrinsicName !== 'never'
		&& (checker.isTypeAssignableTo(type, checker.getNumberType()) || checker.isTypeAssignableTo(type, checker.getBigIntType())),
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
			* fix(fixer) {
				yield fixer.replaceText(node, `String(${getCallArgumentText(value, context)})`);
				yield fixSpaceAroundKeyword(fixer, node, context);
			},
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
			description: 'Prefer `String()` for decimal string conversion of numbers.',
			recommended: false,
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
