import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isMethodCall,
	isNewExpression,
} from '../ast/index.js';
import typedArray from '../shared/typed-array.js';

const array = 'array';
const nonArray = 'non-array';
const unknown = 'unknown';

const typedArrayTypes = new Set(typedArray);

const nonArrayExpressionTypes = new Set([
	'ObjectExpression',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'TemplateLiteral',
]);

const nonArrayTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSVoidKeyword',
	'TSLiteralType',
	'TSTypeLiteral',
	'TSFunctionType',
	'TSConstructorType',
]);

const resolveIdentifierName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
};

const combineUnionTypes = types => {
	if (types.every(type => type === array)) {
		return array;
	}

	if (!types.includes(unknown) && types.includes(nonArray)) {
		return nonArray;
	}

	return unknown;
};

const combineIntersectionTypes = types => {
	if (types.includes(array)) {
		return array;
	}

	if (types.every(type => type === nonArray)) {
		return nonArray;
	}

	return unknown;
};

const getInterfaceHeritageType = (node, scope, visitedTypeReferenceNames) => {
	if (node.expression.type !== 'Identifier') {
		return unknown;
	}

	return getTypeReferenceType({
		typeName: node.expression,
	}, scope, visitedTypeReferenceNames);
};

const getInterfaceType = (node, scope, visitedTypeReferenceNames) => {
	if (node.extends.length === 0) {
		return nonArray;
	}

	return combineIntersectionTypes(node.extends.map(node => getInterfaceHeritageType(node, scope, visitedTypeReferenceNames)));
};

const getTypeReferenceType = (node, scope, visitedTypeReferenceNames) => {
	if (node.typeName.type !== 'Identifier') {
		return unknown;
	}

	const typeReferenceName = node.typeName.name;

	if (typeReferenceName === 'Array' || typeReferenceName === 'ReadonlyArray') {
		return array;
	}

	if (typedArrayTypes.has(typeReferenceName)) {
		return nonArray;
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return unknown;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const typeVariable = resolveIdentifierName(typeReferenceName, scope);
	const [definition] = typeVariable?.defs ?? [];

	if (!definition) {
		visitedTypeReferenceNames.delete(typeReferenceName);
		return unknown;
	}

	let type = unknown;

	if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		type = getTypeAnnotationType(definition.node.typeAnnotation, scope, visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeParameter'
	) {
		type = getTypeAnnotationType(definition.node.constraint, scope, visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		type = getInterfaceType(definition.node, scope, visitedTypeReferenceNames);
	} else if (definition.type === 'ClassName') {
		type = nonArray;
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return type;
};

const getTypeAnnotationType = (node, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, scope, visitedTypeReferenceNames);
		}

		case 'TSArrayType':
		case 'TSTupleType': {
			return array;
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationType(node.typeAnnotation, scope, visitedTypeReferenceNames)
				: unknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, scope, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeAnnotationType(type, scope, visitedTypeReferenceNames)));
		}

		default: {
			return nonArrayTypeAnnotations.has(node?.type) ? nonArray : unknown;
		}
	}
};

const getTypeScriptType = (type, checker) => {
	if (type.intrinsicName === 'any' || type.intrinsicName === 'unknown') {
		return unknown;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();

		return constraint ? getTypeScriptType(constraint, checker) : unknown;
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getTypeScriptType(type, checker)));
	}

	if (type.isIntersection()) {
		return combineIntersectionTypes(type.types.map(type => getTypeScriptType(type, checker)));
	}

	return checker.isArrayType(type) || checker.isTupleType(type) ? array : nonArray;
};

const getTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		return getTypeScriptType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		return unknown;
	}
};

const getTypeFromStaticValue = (node, scope) => {
	const result = getStaticValue(node, scope);

	if (!result) {
		return unknown;
	}

	return Array.isArray(result.value) ? array : nonArray;
};

const getTypeFromVariable = (node, context, visitedVariables) => {
	const scope = context.sourceCode.getScope(node);
	const variable = findVariable(scope, node);

	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return unknown;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, scope);
	let type = unknown;

	if (typeFromAnnotation !== unknown) {
		type = typeFromAnnotation;
	} else if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.init
	) {
		type = getArrayType(definition.node.init, context, visitedVariables);
	}

	visitedVariables.delete(variable);

	return type;
};

function getArrayType(node, context, visitedVariables = new Set()) {
	if (!node) {
		return unknown;
	}

	const scope = context.sourceCode.getScope(node);

	switch (node.type) {
		case 'Identifier': {
			const typeFromVariable = getTypeFromVariable(node, context, visitedVariables);

			if (typeFromVariable !== unknown) {
				return typeFromVariable;
			}

			break;
		}

		case 'TSSatisfiesExpression': {
			return getArrayType(node.expression, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, scope);

			return typeFromAnnotation === unknown
				? getArrayType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getArrayType(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getArrayType(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineUnionTypes([
				getArrayType(node.consequent, context, visitedVariables),
				getArrayType(node.alternate, context, visitedVariables),
			]);
		}

		default: {
			break;
		}
	}

	const typeFromStaticValue = getTypeFromStaticValue(node, scope);

	if (typeFromStaticValue !== unknown) {
		return typeFromStaticValue;
	}

	if (node.type === 'ArrayExpression') {
		return array;
	}

	if (isNewExpression(node, {name: 'Array'})) {
		return array;
	}

	if (node.type === 'NewExpression') {
		return nonArray;
	}

	if (isCallExpression(node, {name: 'Array'})) {
		return array;
	}

	if (isMethodCall(node, {
		object: 'Array',
		methods: ['from', 'of'],
		optionalCall: false,
		optionalMember: false,
	})) {
		return array;
	}

	if (nonArrayExpressionTypes.has(node.type)) {
		return nonArray;
	}

	return getTypeFromTypeInformation(node, context);
}

export const isKnownNonArray = (node, context) => getArrayType(node, context) === nonArray;

export default function isArray(node, context) {
	return getArrayType(node, context) === array;
}
