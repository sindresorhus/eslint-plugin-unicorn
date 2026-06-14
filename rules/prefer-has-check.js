import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall, isNewExpression, isUndefined} from './ast/index.js';
import {
	getParenthesizedText,
	getTypeSymbol,
	isBooleanExpression,
	isControlFlowTest,
	isDefaultLibrarySymbol,
	isParenthesized,
	isNullishType,
	isUnknownType,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-has-check';
const messages = {
	[MESSAGE_ID]: 'Prefer `.has(…)` when checking existence.',
};

const mapTypeNames = new Set([
	'Map',
	'ReadonlyMap',
	'WeakMap',
]);

const nullSentinelTypeNames = new Set([
	'FormData',
	'Headers',
	'URLSearchParams',
]);

const unsupportedBooleanTypeNames = new Set([
	'any',
	'bigint',
	'boolean',
	'false',
	'number',
	'string',
	'unknown',
	'undefined',
	'null',
	'void',
]);

const transparentExpressionTypes = new Set([
	'ParenthesizedExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
]);

const unwrapExpression = node => {
	while (transparentExpressionTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const getTransparentExpressionAncestor = node => {
	while (
		transparentExpressionTypes.has(node.parent?.type)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
};

const getSingleArgumentText = (callExpression, context) => {
	const [argument] = callExpression.arguments;
	return context.sourceCode.getText(argument);
};

const getMemberExpressionObjectText = (node, context) => {
	const text = getParenthesizedText(node, context);
	return !isParenthesized(node, context) && shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${text})` : text;
};

const isUnshadowedGlobalIdentifier = (node, context) => {
	if (context.sourceCode.isGlobalReference(node)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return !variable || variable.defs.length === 0;
};

const getTypeNameFromSyntax = (node, context, visitedVariables = new Set()) => {
	node = unwrapExpression(node);

	if (
		isNewExpression(node)
		&& node.callee.type === 'Identifier'
		&& nullSentinelTypeNames.has(node.callee.name)
		&& isUnshadowedGlobalIdentifier(node.callee, context)
	) {
		return node.callee.name;
	}

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return;
	}

	return getTypeNameFromSyntax(definition.node.init, context, visitedVariables);
};

const isDefaultLibraryType = (type, program) =>
	isDefaultLibrarySymbol(getTypeSymbol(type), program);

const getBuiltinTypeName = (type, program) => {
	for (const candidate of [type, type.target]) {
		if (!candidate) {
			continue;
		}

		const symbol = getTypeSymbol(candidate);
		if (isDefaultLibrarySymbol(symbol, program)) {
			return symbol.getName();
		}
	}
};

const getTypeNameFromType = (type, checker, program) => {
	if (isUnknownType(type) || isNullishType(type)) {
		return;
	}

	if (type.isUnion()) {
		const names = new Set(type.types.map(type => getTypeNameFromType(type, checker, program)));
		return names.size === 1 ? [...names][0] : undefined;
	}

	const typeName = getBuiltinTypeName(type, program);
	if (
		mapTypeNames.has(typeName)
		|| nullSentinelTypeNames.has(typeName)
	) {
		return typeName;
	}
};

const getTypeNameFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		return getTypeNameFromType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {}
};

const getTypeName = (node, context) =>
	getTypeNameFromTypeInformation(node, context)
	?? getTypeNameFromSyntax(node, context);

const getMapValueType = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		const checker = program.getTypeChecker();
		const type = parserServices.getTypeAtLocation(node);
		return getMapValueTypeFromType(type, checker, program);
	} catch {}
};

const getMapValueTypeFromType = (type, checker, program) => {
	if (isUnknownType(type) || isNullishType(type)) {
		return;
	}

	if (type.isUnion()) {
		const valueTypes = type.types.map(type => getMapValueTypeFromType(type, checker, program));
		return valueTypes.every(Boolean) ? checker.getUnionType(valueTypes) : undefined;
	}

	const typeName = getBuiltinTypeName(type, program);
	if (!mapTypeNames.has(typeName)) {
		return;
	}

	const typeArguments = checker.getTypeArguments(type);
	return typeArguments.at(-1);
};

const getConstrainedType = (type, checker) => {
	if (!type.isTypeParameter?.()) {
		return type;
	}

	return type.getConstraint() ?? checker.getBaseConstraintOfType(type);
};

const isDefinitelyNotType = (type, checker, typeNames) => {
	if (isUnknownType(type)) {
		return false;
	}

	const constrainedType = getConstrainedType(type, checker);
	if (constrainedType && constrainedType !== type) {
		return isDefinitelyNotType(constrainedType, checker, typeNames);
	}

	if (type.isUnion()) {
		return type.types.every(type => isDefinitelyNotType(type, checker, typeNames));
	}

	if (type.isIntersection()) {
		return type.types.every(type => isDefinitelyNotType(type, checker, typeNames));
	}

	return !typeNames.has(type.intrinsicName);
};

const isEmptyObjectType = (type, checker) => checker.typeToString(type) === '{}';

const isDefinitelyTruthyType = (type, checker, program) => {
	if (isUnknownType(type) || isNullishType(type)) {
		return false;
	}

	const constrainedType = getConstrainedType(type, checker);
	if (constrainedType && constrainedType !== type) {
		return isDefinitelyTruthyType(constrainedType, checker, program);
	}

	if (type.isUnion()) {
		return type.types.every(type => isDefinitelyTruthyType(type, checker, program));
	}

	if (type.isIntersection()) {
		return type.types.every(type => isDefinitelyTruthyType(type, checker, program));
	}

	if (unsupportedBooleanTypeNames.has(type.intrinsicName)) {
		return false;
	}

	if (type.intrinsicName === 'true') {
		return true;
	}

	if (type.isStringLiteral?.()) {
		return type.value.length > 0;
	}

	if (type.isNumberLiteral?.()) {
		return type.value !== 0;
	}

	if (type.isBigIntLiteral?.()) {
		return type.value.negative || type.value.base10Value !== '0';
	}

	if (/^-?0n$/u.test(checker.typeToString(type))) {
		return false;
	}

	return !isEmptyObjectType(type, checker)
		&& (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0 || !isDefaultLibraryType(type, program));
};

const hasSafeMapValueType = (node, context, kind) => {
	const valueType = getMapValueType(node, context);
	if (!valueType) {
		return false;
	}

	const {program} = context.sourceCode.parserServices;
	const checker = program.getTypeChecker();

	if (kind === 'truthy') {
		return isDefinitelyTruthyType(valueType, checker, program);
	}

	if (kind === 'not-undefined') {
		return isDefinitelyNotType(valueType, checker, new Set(['undefined', 'void']));
	}

	return isDefinitelyNotType(valueType, checker, new Set(['undefined', 'void', 'null']));
};

const getCallKind = (callExpression, comparison, context) => {
	const typeName = getTypeName(callExpression.callee.object, context);
	if (!typeName) {
		return;
	}

	if (nullSentinelTypeNames.has(typeName)) {
		return {missingType: 'null'};
	}

	if (mapTypeNames.has(typeName)) {
		if (
			isUndefined(comparison.value)
			&& hasSafeMapValueType(callExpression.callee.object, context, 'not-undefined')
		) {
			return {missingType: 'undefined'};
		}

		if (
			isNullLiteral(comparison.value)
			&& (comparison.operator === '!=' || comparison.operator === '==')
			&& hasSafeMapValueType(callExpression.callee.object, context, 'not-nullish')
		) {
			return {missingType: 'nullish'};
		}
	}
};

const isNullLiteral = node => node.type === 'Literal' && node.value === null;

const getComparison = callExpression => {
	const comparisonTarget = getTransparentExpressionAncestor(callExpression);
	const {parent} = comparisonTarget;
	if (
		parent?.type !== 'BinaryExpression'
		|| !['!==', '===', '!=', '=='].includes(parent.operator)
	) {
		return;
	}

	if (parent.left === comparisonTarget) {
		return {
			node: parent,
			operator: parent.operator,
			value: parent.right,
		};
	}

	if (parent.right === comparisonTarget) {
		return {
			node: parent,
			operator: parent.operator,
			value: parent.left,
		};
	}
};

const isPositiveComparison = ({operator}) => operator === '!==' || operator === '!=';

const isMatchingMissingValue = (value, missingType) =>
	missingType === 'undefined' ? isUndefined(value) : isNullLiteral(value);

const getComparisonFix = (callExpression, comparison, context) => {
	if (context.sourceCode.getCommentsInside(comparison.node).length > context.sourceCode.getCommentsInside(callExpression).length) {
		return;
	}

	const replacement = `${isPositiveComparison(comparison) ? '' : '!'}${getMemberExpressionObjectText(callExpression.callee.object, context)}.has(${getSingleArgumentText(callExpression, context)})`;
	return fixer => fixer.replaceText(comparison.node, replacement);
};

const isSafeBooleanMapCall = (callExpression, context) =>
	mapTypeNames.has(getTypeName(callExpression.callee.object, context))
	&& hasSafeMapValueType(callExpression.callee.object, context, 'truthy');

const getBooleanFix = callExpression => fixer => fixer.replaceText(callExpression.callee.property, 'has');

const getProblem = (callExpression, context) => {
	if (!isMethodCall(callExpression, {
		method: 'get',
		argumentsLength: 1,
		computed: false,
		optionalCall: false,
		optionalMember: false,
		allowSpreadElement: false,
	})) {
		return;
	}

	const comparison = getComparison(callExpression);
	if (comparison) {
		if (context.sourceCode.getCommentsInside(callExpression).length > 0) {
			return;
		}

		const callKind = getCallKind(callExpression, comparison, context);
		if (!callKind || !isMatchingMissingValue(comparison.value, callKind.missingType)) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			fix: getComparisonFix(callExpression, comparison, context),
		};
	}

	if (
		(isBooleanExpression(callExpression, context) || isControlFlowTest(callExpression))
		&& isSafeBooleanMapCall(callExpression, context)
	) {
		if (context.sourceCode.getCommentsInside(callExpression).length > 0) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			fix: getBooleanFix(callExpression),
		};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => getProblem(callExpression, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.has()` when checking existence.',
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
