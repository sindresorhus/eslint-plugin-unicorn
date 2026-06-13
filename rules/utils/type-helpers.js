import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isNewExpression,
} from '../ast/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isNullishType,
	isUnknownType,
} from './types.js';

const target = 'target';
const nonTarget = 'non-target';
const unknown = 'unknown';

const nonTargetTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSVoidKeyword',
	'TSArrayType',
	'TSLiteralType',
	'TSTupleType',
	'TSTypeLiteral',
	'TSFunctionType',
	'TSConstructorType',
]);

const combineUnionTypes = types => {
	if (types.every(type => type === target)) {
		return target;
	}

	if (types.every(type => type === nonTarget)) {
		return nonTarget;
	}

	return unknown;
};

const combineIntersectionTypes = types => {
	if (types.includes(target)) {
		return target;
	}

	if (types.every(type => type === nonTarget)) {
		return nonTarget;
	}

	return unknown;
};

const resolveIdentifierName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
};

const getTypeName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
};

const getInterfaceHeritageType = (node, scope, options, visitedTypeReferenceNames) => {
	if (!getTypeName(node.expression)) {
		return unknown;
	}

	return getTypeReferenceType({typeName: node.expression}, scope, options, visitedTypeReferenceNames);
};

const getClassHeritageType = (node, scope, options, visitedTypeReferenceNames) => {
	if (!node.superClass) {
		return nonTarget;
	}

	const name = node.superClass.type === 'Identifier' ? node.superClass.name : undefined;
	if (!name) {
		return unknown;
	}

	return getTypeReferenceType({typeName: node.superClass}, scope, options, visitedTypeReferenceNames);
};

const getInterfaceType = (node, scope, options, visitedTypeReferenceNames) => {
	if (node.extends.length === 0) {
		return nonTarget;
	}

	return combineIntersectionTypes(node.extends.map(node => getInterfaceHeritageType(node, scope, options, visitedTypeReferenceNames)));
};

function getTypeReferenceType(node, scope, options, visitedTypeReferenceNames) {
	const typeReferenceName = getTypeName(node.typeName);

	if (!typeReferenceName) {
		return unknown;
	}

	const aliasTarget = options.typeReferenceAliases?.get(typeReferenceName);
	if (options.targetTypeNames.has(typeReferenceName) || (aliasTarget && options.targetTypeNames.has(aliasTarget))) {
		return target;
	}

	if (options.nonTargetTypeNames?.has(typeReferenceName)) {
		return nonTarget;
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
		type = getTypeAnnotationType(definition.node.typeAnnotation, scope, options, visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeParameter'
	) {
		type = getTypeAnnotationType(definition.node.constraint, scope, options, visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		type = getInterfaceType(definition.node, scope, options, visitedTypeReferenceNames);
	} else if (definition.type === 'ClassName') {
		type = getClassHeritageType(definition.node, scope, options, visitedTypeReferenceNames);
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return type;
}

function getTypeAnnotationType(node, scope, options, visitedTypeReferenceNames = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, scope, options, visitedTypeReferenceNames);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationType(node.typeAnnotation, scope, options, visitedTypeReferenceNames)
				: unknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, scope, options, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceNames)));
		}

		default: {
			if (options.isTargetTypeAnnotation?.(node)) {
				return target;
			}

			return nonTargetTypeAnnotations.has(node?.type) ? nonTarget : unknown;
		}
	}
}

function getTypeScriptType(type, checker, program, options) {
	if (isUnknownType(type)) {
		return unknown;
	}

	if (isNullishType(type)) {
		return nonTarget;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();

		return constraint ? getTypeScriptType(constraint, checker, program, options) : unknown;
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getTypeScriptType(type, checker, program, options)));
	}

	if (type.isIntersection()) {
		return combineIntersectionTypes(type.types.map(type => getTypeScriptType(type, checker, program, options)));
	}

	if (options.isTargetType?.(type, checker, program)) {
		return target;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getTypeScriptType(constraint, checker, program, options);
	}

	if (getBaseTypes(type, checker).some(type => getTypeScriptType(type, checker, program, options) === target)) {
		return target;
	}

	const symbol = getTypeSymbol(type);
	if (!symbol) {
		return unknown;
	}

	const typeName = symbol.getName();
	const aliasTarget = options.typeReferenceAliases?.get(typeName);
	return options.targetTypeNames.has(typeName) || (aliasTarget && options.targetTypeNames.has(aliasTarget))
		? target
		: nonTarget;
}

const getTypeFromTypeInformation = (node, context, options) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const {program} = parserServices;
		return getTypeScriptType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
			options,
		);
	} catch {
		return unknown;
	}
};

const getTypeFromStaticValue = (node, scope, options) => {
	const result = getStaticValue(node, scope);

	if (!result) {
		return unknown;
	}

	return options.getStaticType?.(result.value) ?? unknown;
};

const getTypeFromVariable = (node, context, options, visitedVariables) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);

	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return unknown;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const definitionScope = context.sourceCode.getScope(definition.name);
	const typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, definitionScope, options);
	let type = unknown;

	if (typeFromAnnotation !== unknown) {
		type = typeFromAnnotation;
	} else if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.id === definition.name
		&& definition.node.init
	) {
		type = getType(definition.node.init, context, options, visitedVariables);
	}

	visitedVariables.delete(variable);

	return type;
};

const getTypeFromExpression = (node, context, options, visitedVariables) => {
	const scope = context.sourceCode.getScope(node);

	switch (node.type) {
		case 'Identifier': {
			return getTypeFromVariable(node, context, options, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, scope, options);

			return typeFromAnnotation === unknown
				? getType(node.expression, context, options, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getType(node.expression, context, options, visitedVariables);
		}

		case 'SequenceExpression': {
			return getType(node.expressions.at(-1), context, options, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineUnionTypes([
				getType(node.consequent, context, options, visitedVariables),
				getType(node.alternate, context, options, visitedVariables),
			]);
		}

		default: {
			return unknown;
		}
	}
};

function getType(node, context, options, visitedVariables = new Set()) {
	if (!node) {
		return unknown;
	}

	if (node.type === 'TSSatisfiesExpression') {
		return getType(node.expression, context, options, visitedVariables);
	}

	const scope = context.sourceCode.getScope(node);
	const typeFromOwnAnnotation = getTypeAnnotationType(node.typeAnnotation, scope, options);
	if (typeFromOwnAnnotation !== unknown) {
		return typeFromOwnAnnotation;
	}

	const typeFromExpression = getTypeFromExpression(node, context, options, visitedVariables);
	if (typeFromExpression !== unknown) {
		return typeFromExpression;
	}

	if (node.type !== 'Identifier') {
		const typeFromStaticValue = getTypeFromStaticValue(node, scope, options);
		if (typeFromStaticValue !== unknown) {
			return typeFromStaticValue;
		}
	}

	if (options.isTargetNode?.(node, context)) {
		return target;
	}

	if (
		options.targetConstructorNames?.some(name => isNewExpression(node, {name}))
		|| options.targetCallNames?.some(name => isCallExpression(node, {name}))
	) {
		return target;
	}

	return getTypeFromTypeInformation(node, context, options);
}

const createTypeCheckers = options => ({
	isTarget: (node, context) => getType(node, context, options) === target,
	isKnownNonTarget: (node, context) => getType(node, context, options) === nonTarget,
});

export {
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
};
