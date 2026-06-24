import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
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

const mapConstructorTypeNames = new Set([
	'Map',
	'WeakMap',
]);

const nullSentinelTypeNames = new Set([
	'FormData',
	'Headers',
	'URLSearchParams',
]);

const definitelyTruthyBuiltinTypeNames = new Set([
	'Array',
	'ReadonlyArray',
]);

const constructibleCollectionTypeNames = mapConstructorTypeNames.union(nullSentinelTypeNames);

const typeReferenceDefinitionTypes = new Set([
	'ClassName',
	'ImportBinding',
	'TSEnumName',
	'Type',
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

const transparentTypeAnnotationTypes = new Set([
	'TSTypeAnnotation',
	'TSParenthesizedType',
]);

const unsupportedValueTypeAnnotationTypes = new Set([
	'TSAnyKeyword',
	'TSNeverKeyword',
	'TSUndefinedKeyword',
	'TSUnknownKeyword',
	'TSVoidKeyword',
]);

const possiblyFalsyPrimitiveValueTypeAnnotationTypes = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
]);

const alwaysSafeValueTypeAnnotationTypes = new Set([
	'TSArrayType',
	'TSConstructorType',
	'TSFunctionType',
	'TSObjectKeyword',
	'TSSymbolKeyword',
	'TSTupleType',
]);

const definitelySafeExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'NewExpression',
	'ObjectExpression',
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

const getTypeReferenceName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeReferenceName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
};

const getTypeReferenceArguments = node =>
	node.typeArguments?.params ?? node.typeParameters?.params ?? [];

const getTypeReferenceDefinition = (typeReferenceName, scope) => {
	while (scope) {
		const definition = scope.set
			.get(typeReferenceName)
			?.defs
			.find(definition => typeReferenceDefinitionTypes.has(definition.type));

		if (definition) {
			return definition;
		}

		scope = scope.upper;
	}
};

const getNonGenericTypeAliasAnnotation = definition => {
	if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& getTypeReferenceArguments(definition.node).length === 0
	) {
		return definition.node.typeAnnotation;
	}
};

const isUnshadowedGlobalIdentifier = (node, context) => {
	if (context.sourceCode.isGlobalReference(node)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return !variable || variable.defs.length === 0;
};

const isGlobalUndefined = (node, context) =>
	isUndefined(node) && isUnshadowedGlobalIdentifier(node, context);

const isVoidZero = node =>
	node.type === 'UnaryExpression'
	&& node.operator === 'void'
	&& node.argument.type === 'Literal'
	&& node.argument.value === 0;

const isUndefinedSentinel = (node, context) =>
	isGlobalUndefined(node, context) || isVoidZero(node);

const getKnownTypeReferenceDefinitionTypeAnnotation = (typeReferenceName, scope, visitedTypeReferenceNames) => {
	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const definition = getTypeReferenceDefinition(typeReferenceName, scope);
	return getNonGenericTypeAliasAnnotation(definition);
};

const getCollectionInfoFromTypeName = (typeName, valueType) => {
	if (mapTypeNames.has(typeName)) {
		return {
			kind: 'map',
			typeName,
			valueType,
		};
	}

	if (nullSentinelTypeNames.has(typeName)) {
		return {
			kind: 'null-sentinel',
			typeName,
		};
	}
};

const getCollectionInfoFromTypeAnnotation = (node, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getCollectionInfoFromTypeAnnotation(node.typeAnnotation, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getCollectionInfoFromTypeAnnotation(node.typeAnnotation, scope, visitedTypeReferenceNames)
				: undefined;
		}

		case 'TSTypeReference': {
			const typeReferenceName = getTypeReferenceName(node.typeName);
			if (!typeReferenceName) {
				return;
			}

			if (
				(mapTypeNames.has(typeReferenceName) || nullSentinelTypeNames.has(typeReferenceName))
				&& !getTypeReferenceDefinition(typeReferenceName, scope)
			) {
				return getCollectionInfoFromTypeName(typeReferenceName, getTypeReferenceArguments(node).at(-1));
			}

			const typeAnnotation = getKnownTypeReferenceDefinitionTypeAnnotation(typeReferenceName, scope, visitedTypeReferenceNames);
			return typeAnnotation ? getCollectionInfoFromTypeAnnotation(typeAnnotation, scope, visitedTypeReferenceNames) : undefined;
		}

		default:
	}
};

const getCollectionInfoFromExpressionAnnotation = (node, context) => {
	const scope = context.sourceCode.getScope(node);
	return getCollectionInfoFromTypeAnnotation(node.typeAnnotation, scope);
};

const getCollectionInfoFromSyntax = (node, context, visitedVariables = new Set()) => {
	const collectionInfo = getCollectionInfoFromExpressionAnnotation(node, context);
	if (collectionInfo) {
		return collectionInfo;
	}

	node = unwrapExpression(node);

	if (
		isNewExpression(node)
		&& node.callee.type === 'Identifier'
		&& constructibleCollectionTypeNames.has(node.callee.name)
		&& isUnshadowedGlobalIdentifier(node.callee, context)
	) {
		return getCollectionInfoFromTypeName(node.callee.name);
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
	const collectionInfoFromAnnotation = getCollectionInfoFromTypeAnnotation(definition.name?.typeAnnotation, context.sourceCode.getScope(definition.name));
	if (collectionInfoFromAnnotation) {
		return collectionInfoFromAnnotation;
	}

	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return;
	}

	return getCollectionInfoFromSyntax(definition.node.init, context, visitedVariables);
};

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

const getCollectionInfoFromType = (type, checker, program) => {
	if (isUnknownType(type) || isNullishType(type)) {
		return;
	}

	if (type.isUnion()) {
		const collectionInfos = type.types.map(type => getCollectionInfoFromType(type, checker, program));
		const typeNames = new Set(collectionInfos.map(collectionInfo => collectionInfo?.typeName));
		if (typeNames.size === 1) {
			const [collectionInfo] = collectionInfos;
			if (collectionInfo?.kind !== 'map') {
				return collectionInfo;
			}

			const valueTypes = collectionInfos.map(collectionInfo => collectionInfo?.valueType);
			return {
				...collectionInfo,
				valueType: valueTypes.every(Boolean) ? checker.getUnionType(valueTypes) : undefined,
			};
		}

		if (collectionInfos.every(collectionInfo => collectionInfo?.kind === 'map')) {
			const valueTypes = collectionInfos.map(collectionInfo => collectionInfo.valueType);
			return {
				kind: 'map',
				typeName: 'Map',
				valueType: valueTypes.every(Boolean) ? checker.getUnionType(valueTypes) : undefined,
			};
		}

		if (collectionInfos.every(collectionInfo => collectionInfo?.kind === 'null-sentinel')) {
			return {
				kind: 'null-sentinel',
				typeName: 'null-sentinel',
			};
		}

		return;
	}

	if (type.isIntersection()) {
		return type.types
			.map(type => getCollectionInfoFromType(type, checker, program))
			.find(collectionInfo => collectionInfo?.kind === 'map');
	}

	const typeName = getBuiltinTypeName(type, program);
	return getCollectionInfoFromTypeName(
		typeName,
		mapTypeNames.has(typeName) ? checker.getTypeArguments(type).at(-1) : undefined,
	);
};

const getCollectionInfoFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		return getCollectionInfoFromType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {}
};

const getCollectionInfo = (node, context) =>
	getCollectionInfoFromTypeInformation(node, context)
	?? getCollectionInfoFromSyntax(node, context);

const getLiteralTypeValue = node => {
	if (node.type === 'Literal') {
		return node.value;
	}

	if (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	) {
		return node.quasis[0].value.cooked;
	}

	if (
		node.type === 'UnaryExpression'
		&& (node.operator === '-' || node.operator === '+')
		&& node.argument.type === 'Literal'
		&& (typeof node.argument.value === 'number' || typeof node.argument.value === 'bigint')
	) {
		return node.operator === '-' ? -node.argument.value : node.argument.value;
	}
};

const getTypeAnnotationDefinition = (typeReferenceName, scope) => {
	const definition = getTypeReferenceDefinition(typeReferenceName, scope);
	const typeAnnotation = getNonGenericTypeAliasAnnotation(definition);

	if (typeAnnotation) {
		return {
			type: 'alias',
			node: typeAnnotation,
		};
	}

	if (definition?.type === 'ClassName') {
		return {
			type: 'object',
		};
	}

	if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		return {
			type: 'object',
		};
	}
};

const isDefinitelySafeLiteralValue = (value, kind) => {
	if (kind === 'truthy') {
		return Boolean(value);
	}

	if (kind === 'not-undefined') {
		return value !== undefined;
	}

	return value !== undefined && value !== null;
};

const isSafeTypeReferenceAnnotation = (node, context, kind, visitedTypeReferenceNames) => {
	const typeReferenceName = getTypeReferenceName(node.typeName);
	if (!typeReferenceName || visitedTypeReferenceNames.has(typeReferenceName)) {
		return false;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const definition = getTypeAnnotationDefinition(typeReferenceName, context.sourceCode.getScope(node.typeName));
	let isSafe = false;

	if (definition?.type === 'alias') {
		isSafe = hasSafeValueTypeAnnotation(definition.node, context, kind, visitedTypeReferenceNames);
	} else if (definition?.type === 'object') {
		isSafe = kind !== 'truthy';
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return isSafe;
};

const hasSafeValueTypeAnnotation = (node, context, kind, visitedTypeReferenceNames = new Set()) => {
	if (!node || unsupportedValueTypeAnnotationTypes.has(node.type)) {
		return false;
	}

	if (transparentTypeAnnotationTypes.has(node.type)) {
		return hasSafeValueTypeAnnotation(node.typeAnnotation, context, kind, visitedTypeReferenceNames);
	}

	if (node.type === 'TSTypeOperator') {
		return node.operator === 'readonly'
			&& hasSafeValueTypeAnnotation(node.typeAnnotation, context, kind, visitedTypeReferenceNames);
	}

	if (node.type === 'TSUnionType' || node.type === 'TSIntersectionType') {
		return node.types.every(type => hasSafeValueTypeAnnotation(type, context, kind, visitedTypeReferenceNames));
	}

	if (node.type === 'TSNullKeyword') {
		return kind === 'not-undefined';
	}

	if (possiblyFalsyPrimitiveValueTypeAnnotationTypes.has(node.type)) {
		return kind !== 'truthy';
	}

	if (alwaysSafeValueTypeAnnotationTypes.has(node.type)) {
		return true;
	}

	if (node.type === 'TSTypeLiteral') {
		return kind !== 'truthy';
	}

	if (node.type === 'TSLiteralType') {
		const value = getLiteralTypeValue(node.literal);
		return value === undefined ? false : isDefinitelySafeLiteralValue(value, kind);
	}

	return node.type === 'TSTypeReference'
		&& isSafeTypeReferenceAnnotation(node, context, kind, visitedTypeReferenceNames);
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

	if (type.isTypeParameter?.()) {
		return false;
	}

	if (type.isUnion()) {
		return type.types.every(type => isDefinitelyNotType(type, checker, typeNames));
	}

	if (type.isIntersection()) {
		return type.types.every(type => isDefinitelyNotType(type, checker, typeNames));
	}

	return !typeNames.has(type.intrinsicName);
};

const isObjectKeywordType = (type, checker) => checker.typeToString(type) === 'object';

const hasTruthyCallOrConstructSignature = type =>
	type.getCallSignatures().length > 0
	|| type.getConstructSignatures().length > 0;

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

	if (type.intrinsicName === 'symbol') {
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

	const typeText = checker.typeToString(type);
	if (/^-?\d+n$/u.test(typeText)) {
		return !/^-?0n$/u.test(typeText);
	}

	return isObjectKeywordType(type, checker)
		|| definitelyTruthyBuiltinTypeNames.has(getBuiltinTypeName(type, program))
		|| hasTruthyCallOrConstructSignature(type);
};

const isDefinitelySafeExpression = (node, context, kind) => {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	if (staticValue) {
		return isDefinitelySafeLiteralValue(staticValue.value, kind);
	}

	if (isUndefined(node)) {
		return false;
	}

	return definitelySafeExpressionTypes.has(node.type);
};

const getMapConstructorValueSafety = (node, context, kind) => {
	if (
		!isNewExpression(node)
		|| node.callee.type !== 'Identifier'
		|| !mapConstructorTypeNames.has(node.callee.name)
		|| !isUnshadowedGlobalIdentifier(node.callee, context)
	) {
		return;
	}

	if (node.arguments.length === 0) {
		return true;
	}

	if (node.arguments.length !== 1) {
		return;
	}

	const [entries] = node.arguments;
	if (entries.type !== 'ArrayExpression') {
		return;
	}

	return entries.elements.every(element =>
		element?.type === 'ArrayExpression'
		&& element.elements.length >= 2
		&& element.elements[1]
		&& element.elements[1].type !== 'SpreadElement'
		&& isDefinitelySafeExpression(element.elements[1], context, kind));
};

const getMapNewExpressionValueSafety = (node, context, kind, checkConstructorValues) => {
	if (
		!isNewExpression(node)
		|| node.callee.type !== 'Identifier'
		|| !mapConstructorTypeNames.has(node.callee.name)
		|| !isUnshadowedGlobalIdentifier(node.callee, context)
	) {
		return;
	}

	if (checkConstructorValues) {
		const constructorValueSafety = getMapConstructorValueSafety(node, context, kind);
		if (constructorValueSafety !== undefined) {
			return constructorValueSafety;
		}
	}

	const valueType = getTypeReferenceArguments(node).at(-1);
	if (valueType) {
		return hasSafeValueTypeAnnotation(valueType, context, kind);
	}

	return false;
};

const getSingleVariable = (node, context, visitedVariables) => {
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

	return variable;
};

const hasSafeMapValueTypeFromDefinition = (definition, context, kind, visitedVariables) => {
	const collectionInfoFromAnnotation = getCollectionInfoFromTypeAnnotation(definition.name?.typeAnnotation, context.sourceCode.getScope(definition.name));
	if (collectionInfoFromAnnotation?.kind === 'map') {
		return collectionInfoFromAnnotation.valueType
			? hasSafeValueTypeAnnotation(collectionInfoFromAnnotation.valueType, context, kind)
			: false;
	}

	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return false;
	}

	return hasSafeMapValueTypeFromSyntax(definition.node.init, context, kind, {
		visitedVariables,
		checkConstructorValues: false,
	});
};

function hasSafeMapValueTypeFromSyntax(node, context, kind, options = {}) {
	const visitedVariables = options.visitedVariables ?? new Set();
	const checkConstructorValues = options.checkConstructorValues ?? true;

	const collectionInfo = getCollectionInfoFromExpressionAnnotation(node, context);
	if (collectionInfo?.kind === 'map') {
		return collectionInfo.valueType
			? hasSafeValueTypeAnnotation(collectionInfo.valueType, context, kind)
			: false;
	}

	node = unwrapExpression(node);

	const mapNewExpressionValueSafety = getMapNewExpressionValueSafety(node, context, kind, checkConstructorValues);
	if (mapNewExpressionValueSafety !== undefined) {
		return mapNewExpressionValueSafety;
	}

	const variable = getSingleVariable(node, context, visitedVariables);
	if (!variable) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const isSafe = hasSafeMapValueTypeFromDefinition(definition, context, kind, visitedVariables);
	visitedVariables.delete(variable);

	return isSafe;
}

const hasSafeMapValueType = (node, context, kind) => {
	const constructorValueSafety = getMapConstructorValueSafety(unwrapExpression(node), context, kind);
	if (constructorValueSafety !== undefined) {
		return constructorValueSafety;
	}

	const valueType = getCollectionInfoFromTypeInformation(node, context)?.valueType;

	if (valueType) {
		const {program} = context.sourceCode.parserServices;
		const checker = program.getTypeChecker();
		let isSafe;

		if (kind === 'truthy') {
			isSafe = isDefinitelyTruthyType(valueType, checker, program);
		} else if (kind === 'not-undefined') {
			isSafe = isDefinitelyNotType(valueType, checker, new Set(['undefined', 'void']));
		} else {
			isSafe = isDefinitelyNotType(valueType, checker, new Set(['undefined', 'void', 'null']));
		}

		if (isSafe) {
			return true;
		}
	}

	return hasSafeMapValueTypeFromSyntax(node, context, kind);
};

const getCallKind = (callExpression, comparison, context) => {
	const collectionInfo = getCollectionInfo(callExpression.callee.object, context);
	if (!collectionInfo) {
		return;
	}

	const isLooseComparison = comparison.operator === '!=' || comparison.operator === '==';

	if (collectionInfo.kind === 'null-sentinel') {
		if (
			isLooseComparison
			&& isUndefinedSentinel(comparison.value, context)
		) {
			return {missingType: 'undefined'};
		}

		return {missingType: 'null'};
	}

	if (collectionInfo.kind === 'map') {
		if (
			isUndefinedSentinel(comparison.value, context)
			&& hasSafeMapValueType(callExpression.callee.object, context, isLooseComparison ? 'not-nullish' : 'not-undefined')
		) {
			return {missingType: 'undefined'};
		}

		if (
			isNullLiteral(comparison.value)
			&& isLooseComparison
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

const isMatchingMissingValue = (value, missingType, context) =>
	missingType === 'undefined' ? isUndefinedSentinel(value, context) : isNullLiteral(value);

const getComparisonFix = (callExpression, comparison, context) => {
	if (context.sourceCode.getCommentsInside(comparison.node).length > context.sourceCode.getCommentsInside(callExpression).length) {
		return;
	}

	const replacement = `${isPositiveComparison(comparison) ? '' : '!'}${getMemberExpressionObjectText(callExpression.callee.object, context)}.has(${getSingleArgumentText(callExpression, context)})`;
	return fixer => fixer.replaceText(comparison.node, replacement);
};

const isSafeBooleanMapCall = (callExpression, context) =>
	getCollectionInfo(callExpression.callee.object, context)?.kind === 'map'
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
		if (!callKind || !isMatchingMissingValue(comparison.value, callKind.missingType, context)) {
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
