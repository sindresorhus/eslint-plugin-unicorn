import {findVariable, isOpeningParenToken as isOpeningParenthesisToken} from '@eslint-community/eslint-utils';
import {
	getArithmeticOrBitwiseOperator,
	getStaticStringValue,
	isBigIntLiteral,
	isIdentifierNamed,
	isMethodCall,
	isNumericLiteral,
	isNumericUnaryOperator,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getCallArgumentText,
	getCommentSafeProblem,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	hasJSDocumentExpressionComment,
	hasLeadingJSDocumentComment,
	hasLeadingJSDocumentType,
	hasOptionalChainElement,
	hasTypeArguments,
	isBigInt,
	isGlobalIdentifier,
	isNumber,
	isTypeScriptFile,
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
const typeCheckedOptions = {
	useTypeInformationOnly: true,
	// A user-defined symbol can share a primitive type's name.
	targetTypeNames: new Set(),
};

// Intersections and unresolved annotations can declare a narrower return type for `.toString()`.
const syntaxOnlyTypeOptions = {
	requireSupportedTypeAnnotations: true,
	treatMixedUnionAsNonTarget: true,
};

const hasEmbeddedJSDocumentType = (node, context) =>
	hasJSDocumentExpressionComment(node, context)
	|| (node.type === 'Property' && hasLeadingJSDocumentType(node, context));

const {isTarget: isNumeric} = createTypeCheckers({
	targetTypeNames: numericTypeNames,
	targetCallNames: ['BigInt', 'Number', 'parseFloat', 'parseInt'],
	checkClassHeritage: false,
	requireStableJSDocumentBindings: true,
	isTargetNode(node, context, isNumeric) {
		if (isNumericLiteral(node) || isBigIntLiteral(node)) {
			return true;
		}

		const operator = getArithmeticOrBitwiseOperator(node);
		if (operator !== undefined) {
			return operator !== '+' || (isNumeric(node.left) && isNumeric(node.right));
		}

		if (node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && isNumericUnaryOperator(node.operator))) {
			return true;
		}

		if (node.type === 'Identifier') {
			// The shared checker follows local constant bindings, including aliases of these globals.
			return ['NaN', 'Infinity'].includes(node.name) && isGlobalIdentifier(node, context);
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
	const {sourceCode} = context;
	const {parserServices} = sourceCode;
	const hasTypeScriptSyntax = parserServices?.esTreeNodeToTSNodeMap || isTypeScriptFile(context.physicalFilename);
	const typeOptions = parserServices?.program
		? typeCheckedOptions
		: {
			...syntaxOnlyTypeOptions,
			// Static evaluation can erase TypeScript assertions inside the receiver.
			...(hasTypeScriptSyntax && {getStaticType: undefined}),
		};

	context.on('CallExpression', node => {
		if (hasTypeArguments(node) || !isMethodCall(node, {argumentsLength: 0})) {
			return;
		}

		const {callee} = node;
		const isToString = callee.computed
			? getStaticStringValue(callee.property) === 'toString'
			: isIdentifierNamed(callee.property, 'toString');
		const {object: value} = callee;
		if (
			!isToString
			|| hasOptionalChainElement(node)
			|| !isNumeric(value, context, typeOptions)
			|| (!parserServices?.program && hasJSDocumentTypeReference(callee, context, hasEmbeddedJSDocumentType))
			|| withTypeInformation(node, context, ({type, checker}) => type !== checker.getStringType())
		) {
			return;
		}

		const problem = {node, messageId: MESSAGE_ID};
		const stringVariable = findVariable(sourceCode.getScope(node), 'String');
		// Even a type-only definition can obscure which value the replacement would use.
		if (stringVariable?.defs.length > 0) {
			return problem;
		}

		// Keep the grouping parentheses that carry a leading JSDoc cast.
		if (hasLeadingJSDocumentComment(node, context) && isOpeningParenthesisToken(sourceCode.getFirstToken(node))) {
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
			recommended: true,
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
