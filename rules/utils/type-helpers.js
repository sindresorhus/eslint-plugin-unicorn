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
const nullish = 'nullish';
const unknown = 'unknown';

const classNodeTypes = new Set([
	'ClassDeclaration',
	'ClassExpression',
]);
const functionNodeTypes = new Set([
	'FunctionDeclaration',
	'FunctionExpression',
]);
const typeReferenceDefinitionTypes = new Set([
	'ClassName',
	'ImportBinding',
	'TSEnumName',
	'Type',
]);
const nonTargetTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSVoidKeyword',
	'TSArrayType',
	'TSLiteralType',
	'TSTupleType',
	'TSTypeLiteral',
	'TSFunctionType',
	'TSConstructorType',
]);
const nullishTypeAnnotations = new Set([
	'TSNullKeyword',
	'TSUndefinedKeyword',
]);

const normalizeType = type => type === nullish ? nonTarget : type;

const combineUnionTypes = (types, options) => {
	types = options.allowNullishInMixedUnion
		? types.filter(type => type !== nullish)
		: types.map(normalizeType);

	if (types.length === 0) {
		return nonTarget;
	}

	if (
		options.treatMixedUnionAsTarget
			? types.includes(target)
			: types.every(type => type === target)
	) {
		return target;
	}

	if (
		options.treatMixedUnionAsNonTarget
			? types.includes(nonTarget)
			: types.every(type => type === nonTarget)
	) {
		return nonTarget;
	}

	return unknown;
};

const combineIntersectionTypes = types => {
	types = types.map(normalizeType);

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

const getTypeName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
};

const getKnownTypeReferenceType = (typeReferenceName, options) => {
	const aliasTarget = options.typeReferenceAliases?.get(typeReferenceName);
	if (options.targetTypeNames.has(typeReferenceName) || (aliasTarget && options.targetTypeNames.has(aliasTarget))) {
		return target;
	}

	return options.nonTargetTypeNames?.has(typeReferenceName) ? nonTarget : unknown;
};

const isAnyTargetImportName = (importedName, targetTypeImports) => {
	for (const importedNames of targetTypeImports.values()) {
		if (importedNames.has(importedName)) {
			return true;
		}
	}

	return false;
};

const getKnownImportedType = (importedType, targetTypeImports, options) => {
	const {
		source,
		importedName,
		localName,
	} = importedType;
	const importedNames = targetTypeImports?.get(source);
	if (importedNames) {
		return importedNames.has(importedName) ? target : nonTarget;
	}

	if (
		(targetTypeImports && isAnyTargetImportName(importedName, targetTypeImports))
		|| getKnownTypeReferenceType(importedName, options) !== unknown
		|| getKnownTypeReferenceType(localName, options) !== unknown
	) {
		return nonTarget;
	}

	return unknown;
};

const getImportBindingType = (definition, options) => {
	if (definition.type !== 'ImportBinding') {
		return unknown;
	}

	if (definition.node.type === 'ImportDefaultSpecifier') {
		return getKnownTypeReferenceType(definition.node.local.name, options) === unknown ? unknown : nonTarget;
	}

	const importedName = definition.node.imported?.name ?? definition.node.imported?.value;
	if (!importedName) {
		return unknown;
	}

	return getKnownImportedType(
		{
			source: definition.parent?.source?.value,
			importedName,
			localName: definition.node.local.name,
		},
		options.targetTypeImports,
		options,
	);
};

const getNamespaceImportBindingType = (node, scope, options) => {
	if (
		node.typeName.type !== 'TSQualifiedName'
		|| node.typeName.left.type !== 'Identifier'
		|| !options.targetTypeNamespaceImports
	) {
		return unknown;
	}

	const importedName = node.typeName.right.name;
	const definition = getTypeReferenceDefinition(node.typeName.left.name, scope);
	if (
		definition?.type !== 'ImportBinding'
		|| (
			definition.node.type !== 'ImportNamespaceSpecifier'
			&& definition.node.type !== 'ImportDefaultSpecifier'
		)
	) {
		return unknown;
	}

	return getKnownImportedType(
		{
			source: definition.parent?.source?.value,
			importedName,
			localName: importedName,
		},
		options.targetTypeNamespaceImports,
		options,
	);
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

	if (!options.checkClassHeritage) {
		return nonTarget;
	}

	if (node.superClass.type !== 'Identifier') {
		return unknown;
	}

	return getClassReferenceTypeFromScope(node.superClass, scope, options, visitedTypeReferenceNames);
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

	const namespaceImportBindingType = getNamespaceImportBindingType(node, scope, options);
	if (namespaceImportBindingType !== unknown) {
		return namespaceImportBindingType;
	}

	if (!options.preferTypeReferenceDefinitions) {
		const knownType = getKnownTypeReferenceType(typeReferenceName, options);
		if (knownType !== unknown) {
			return knownType;
		}
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return unknown;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const definition = getTypeReferenceDefinition(typeReferenceName, scope);

	if (!definition) {
		visitedTypeReferenceNames.delete(typeReferenceName);
		return getKnownTypeReferenceType(typeReferenceName, options);
	}

	let type = unknown;

	const importBindingType = getImportBindingType(definition, options);
	if (importBindingType !== unknown) {
		type = importBindingType;
	} else if (
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
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceNames)), options);
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceNames)));
		}

		default: {
			if (options.isTargetTypeAnnotation?.(node)) {
				return target;
			}

			if (nullishTypeAnnotations.has(node?.type)) {
				return nullish;
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
		return nullish;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();

		return constraint ? getTypeScriptType(constraint, checker, program, options) : unknown;
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getTypeScriptType(type, checker, program, options)), options);
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

	if (
		options.checkClassHeritage
		&& getBaseTypes(type, checker).some(type => getTypeScriptType(type, checker, program, options) === target)
	) {
		return target;
	}

	if (type.intrinsicName) {
		return nonTarget;
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

	return options.getStaticType?.(result.value, node) ?? unknown;
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

const getClassType = (node, scope, options, visitedNames) => {
	if (!node.superClass) {
		return nonTarget;
	}

	if (!options.checkClassHeritage) {
		return nonTarget;
	}

	return getClassReferenceTypeFromScope(node.superClass, scope, options, visitedNames);
};

function getClassReferenceTypeFromScope(node, scope, options, visitedNames = new Set()) {
	if (node.type === 'Identifier') {
		const typeReferenceName = node.name;
		if (!options.checkClassHeritage) {
			return getKnownTypeReferenceType(typeReferenceName, options);
		}

		if (visitedNames.has(typeReferenceName)) {
			return unknown;
		}

		visitedNames.add(typeReferenceName);

		const variable = resolveIdentifierName(typeReferenceName, scope);
		const [definition] = variable?.defs ?? [];
		let type = unknown;

		if (
			definition?.type === 'Variable'
			&& definition.parent.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
		) {
			type = getClassReferenceTypeFromScope(definition.node.init, scope, options, visitedNames);
		} else if (definition?.type === 'ClassName') {
			type = getClassType(definition.node, scope, options, visitedNames);
		}

		visitedNames.delete(typeReferenceName);

		return definition ? type : getKnownTypeReferenceType(typeReferenceName, options);
	}

	if (classNodeTypes.has(node.type)) {
		return getClassType(node, scope, options, visitedNames);
	}

	return unknown;
}

const getClassReferenceType = (node, context, options, visitedNames) =>
	getClassReferenceTypeFromScope(node, context.sourceCode.getScope(node), options, visitedNames);

const getFunctionThisParameterType = (node, context, options) => {
	const thisParameter = node.params.find(node => node.type === 'Identifier' && node.name === 'this');
	return getTypeAnnotationType(thisParameter?.typeAnnotation, context.sourceCode.getScope(node), options);
};

const getThisExpressionType = (node, context, options) => {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (classNodeTypes.has(parent.type)) {
			return getClassType(parent, context.sourceCode.getScope(parent), options);
		}

		if (
			parent.type === 'StaticBlock'
			|| (
				(
					parent.type === 'AccessorProperty'
					|| parent.type === 'PropertyDefinition'
				)
				&& parent.static
			)
		) {
			return nonTarget;
		}

		if (functionNodeTypes.has(parent.type)) {
			const thisParameterType = getFunctionThisParameterType(parent, context, options);
			if (thisParameterType !== unknown) {
				return thisParameterType;
			}

			if (
				parent.parent?.type === 'Property'
				&& parent.parent.parent?.type === 'ObjectExpression'
			) {
				return nonTarget;
			}

			if (parent.parent?.type === 'MethodDefinition') {
				if (parent.parent.static) {
					return nonTarget;
				}

				continue;
			}

			return unknown;
		}
	}

	return unknown;
};

const getSuperExpressionType = (node, context, options) => {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (
			parent.type === 'StaticBlock'
			|| (
				(
					parent.type === 'AccessorProperty'
					|| parent.type === 'PropertyDefinition'
				)
				&& parent.static
			)
			|| (
				parent.type === 'MethodDefinition'
				&& parent.static
			)
		) {
			return nonTarget;
		}

		if (classNodeTypes.has(parent.type)) {
			return parent.superClass
				? getClassReferenceTypeFromScope(parent.superClass, context.sourceCode.getScope(parent), options)
				: nonTarget;
		}
	}

	return unknown;
};

const getTypeFromExpression = (node, context, options, visitedVariables) => {
	const scope = context.sourceCode.getScope(node);

	switch (node.type) {
		case 'Identifier': {
			return getTypeFromVariable(node, context, options, visitedVariables);
		}

		case 'ThisExpression': {
			return options.checkClassSyntax
				? getThisExpressionType(node, context, options)
				: unknown;
		}

		case 'Super': {
			return options.checkClassSyntax
				? getSuperExpressionType(node, context, options)
				: unknown;
		}

		case 'NewExpression': {
			return options.checkClassSyntax
				? getClassReferenceType(node.callee, context, options)
				: unknown;
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
			], options);
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

	const typeFromTypeInformation = getTypeFromTypeInformation(node, context, options);
	if (typeFromTypeInformation !== unknown) {
		return typeFromTypeInformation;
	}

	return options.isNonTargetNode?.(node, context) ? nonTarget : unknown;
}

const createTypeCheckers = options => {
	options = {
		checkClassHeritage: true,
		checkClassSyntax: false,
		...options,
	};

	return {
		getType: (node, context, overrides) => normalizeType(getType(node, context, {...options, ...overrides})),
		isTarget: (node, context, overrides) => getType(node, context, {...options, ...overrides}) === target,
		isKnownNonTarget: (node, context, overrides) => normalizeType(getType(node, context, {...options, ...overrides})) === nonTarget,
	};
};

const createBuiltinTypeCheckers = ({
	name,
	aliases = [],
	checkConstructor = true,
	...options
}) => createTypeCheckers({
	...options,
	targetTypeNames: new Set([name]),
	typeReferenceAliases: new Map(aliases.map(alias => [alias, name])),
	targetConstructorNames: checkConstructor ? [name] : undefined,
});

export {
	createBuiltinTypeCheckers,
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
};
