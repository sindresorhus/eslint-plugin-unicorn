import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isFunction,
	isNewExpression,
} from '../ast/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isNullishType,
	isUnknownType,
	withTypeInformation,
} from './types.js';
import {getStaticValueForControlFlow} from './get-static-value.js';
import {
	getJSDocumentTypeAnnotation,
	getJSDocumentReturnType,
	hasJSDocumentComments,
	hasNativeTypeAssertion,
} from './jsdoc-type.js';
import {getEvaluatedChildNodes} from './get-visitor-child-nodes.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

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

	// An unknown member can be `any`, which overrides the other intersection members.
	if (types.includes(unknown)) {
		return unknown;
	}

	return types.includes(target) ? target : nonTarget;
};

/**
Find the nearest type-like definition (class, import, enum, or type alias/interface) of a type reference name, walking up from `scope`.

@param {string} typeReferenceName
@param {import('eslint').Scope.Scope} scope
@returns {{definition: import('eslint').Scope.Definition, scope: import('eslint').Scope.Scope} | undefined} The definition and the scope that declares it.
*/
const getTypeReferenceDefinition = (typeReferenceName, scope) => {
	while (scope) {
		const definition = scope.set
			.get(typeReferenceName)
			?.defs
			.find(definition => typeReferenceDefinitionTypes.has(definition.type));

		if (definition) {
			return {definition, scope};
		}

		scope = scope.upper;
	}
};

/**
Get the dotted name of a type name node, for example `Foo.Bar`. Its `typeName` is an `Identifier` or a `TSQualifiedName`; `this.Foo` is a parse error.

@param {import('estree').Node} typeName
@returns {string | undefined}
*/
const getTypeName = typeName => {
	if (typeName?.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName?.type === 'TSQualifiedName') {
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

const jsdocPrimitiveNames = new Set(['boolean', 'string', 'number', 'bigint', 'symbol', 'void']);

/**
Prevent static type inference from bypassing an explicit annotation through an alias or a larger expression.
*/
function hasJSDocumentTypeReference(node, context, visitedVariables = new Set()) {
	if (!hasJSDocumentComments(context)) {
		return false;
	}

	node = unwrapTypeScriptExpression(node);
	if (node.type === 'Identifier') {
		if (getJSDocumentTypeAnnotation(node, context)) {
			return true;
		}

		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		if (
			definition?.type !== 'Variable'
			|| definition.node.id !== definition.name
			|| !definition.node.init
			|| visitedVariables.has(variable)
		) {
			return false;
		}

		visitedVariables.add(variable);
		return hasJSDocumentTypeReference(definition.node.init, context, visitedVariables);
	}

	if (isFunction(node) || classNodeTypes.has(node.type)) {
		return false;
	}

	return getEvaluatedChildNodes(node, context.sourceCode.visitorKeys).some(child => hasJSDocumentTypeReference(child, context, visitedVariables));
}

/**
Get a JSDoc type's outer name.
*/
const getJSDocumentTypeName = node => node?.kind === 'name' ? node.name : undefined;

function getJSDocumentTypeNodeType(node, options) {
	switch (node?.kind) {
		case 'nullable':
		case 'optional': {
			return combineUnionTypes([getJSDocumentTypeNodeType(node.element, options), nullish], options);
		}

		case 'union': {
			return combineUnionTypes(getJSDocumentTypeMembers(node).map(type => getJSDocumentTypeNodeType(type, options)), options);
		}

		case 'intersection': {
			return combineIntersectionTypes(node.elements.map(type => getJSDocumentTypeNodeType(type, options)));
		}

		case 'nullish': {
			return nullish;
		}

		default: {
			if (options.isTargetJSDocumentType?.(node)) {
				return target;
			}

			const name = getJSDocumentTypeName(node);
			if (name) {
				const knownType = getKnownTypeReferenceType(name, options);
				if (knownType !== unknown) {
					return knownType;
				}

				if (jsdocPrimitiveNames.has(name)) {
					return nonTarget;
				}
			}

			return node?.kind === 'non-primitive' || node?.kind === 'function' ? nonTarget : unknown;
		}
	}
}

/**
Classify a parsed JSDoc annotation using the same target and union policies as native type annotations.
*/
const getJSDocumentType = (annotation, options) => {
	const type = getJSDocumentTypeNodeType(annotation?.type, options);
	return annotation?.optional ? combineUnionTypes([type, nullish], options) : type;
};

/**
Flatten grouped JSDoc union or intersection members without crossing between the two kinds.
*/
function getJSDocumentTypeMembers(type) {
	return type.elements.flatMap(element => element.kind === type.kind ? getJSDocumentTypeMembers(element) : [element]);
}

/**
Collect documented callable results without treating scalar, optional, or unresolved values as functions.
*/
function getJSDocumentCallableReturnType(type) {
	if (type?.kind === 'function') {
		return type.returnType;
	}

	if (type?.kind !== 'union' && type?.kind !== 'intersection') {
		return;
	}

	const members = type.kind === 'intersection'
		? getJSDocumentTypeMembers(type).filter(element => element.kind !== 'non-primitive')
		: type.elements;
	const returnTypes = members.map(element => getJSDocumentCallableReturnType(element));
	if (returnTypes.length === 0 || returnTypes.includes(undefined)) {
		return;
	}

	return {kind: 'union', elements: returnTypes};
}

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
	const definition = getTypeReferenceDefinition(node.typeName.left.name, scope)?.definition;
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

const getInterfaceHeritageType = (node, scope, options, visitedTypeReferenceDefinitions) =>
	getTypeReferenceType({typeName: node.expression}, scope, options, visitedTypeReferenceDefinitions);

const getClassHeritageType = (node, scope, options, visitedTypeReferenceDefinitions) => {
	if (!node.superClass) {
		return nonTarget;
	}

	if (!options.checkClassHeritage) {
		return nonTarget;
	}

	if (node.superClass.type !== 'Identifier') {
		return unknown;
	}

	return getClassReferenceTypeFromScope(node.superClass, scope, options, visitedTypeReferenceDefinitions);
};

const getInterfaceType = (node, scope, options, visitedTypeReferenceDefinitions) => {
	if (node.extends.length === 0) {
		return nonTarget;
	}

	return combineIntersectionTypes(node.extends.map(node => getInterfaceHeritageType(node, scope, options, visitedTypeReferenceDefinitions)));
};

function getTypeReferenceType(node, scope, options, visitedTypeReferenceDefinitions) {
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

	const {definition, scope: definitionScope} = getTypeReferenceDefinition(typeReferenceName, scope) ?? {};

	if (!definition) {
		return getKnownTypeReferenceType(typeReferenceName, options);
	}

	if (visitedTypeReferenceDefinitions.has(definition)) {
		return unknown;
	}

	visitedTypeReferenceDefinitions.add(definition);

	let type = unknown;

	const importBindingType = getImportBindingType(definition, options);
	if (importBindingType !== unknown) {
		type = importBindingType;
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		type = getTypeAnnotationType(definition.node.typeAnnotation, definitionScope, options, visitedTypeReferenceDefinitions);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeParameter'
	) {
		type = getTypeAnnotationType(definition.node.constraint, definitionScope, options, visitedTypeReferenceDefinitions);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		type = getInterfaceType(definition.node, definitionScope, options, visitedTypeReferenceDefinitions);
	} else if (definition.type === 'ClassName') {
		type = getClassHeritageType(definition.node, definitionScope, options, visitedTypeReferenceDefinitions);
	}

	visitedTypeReferenceDefinitions.delete(definition);

	return type;
}

function getTypeAnnotationType(node, scope, options, visitedTypeReferenceDefinitions = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, scope, options, visitedTypeReferenceDefinitions);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationType(node.typeAnnotation, scope, options, visitedTypeReferenceDefinitions)
				: unknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, scope, options, visitedTypeReferenceDefinitions);
		}

		case 'TSUnionType': {
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceDefinitions)), options);
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeAnnotationType(type, scope, options, visitedTypeReferenceDefinitions)));
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

const getTypeFromTypeInformation = (node, context, options) =>
	withTypeInformation(node, context, ({type, checker, program}) => getTypeScriptType(type, checker, program, options)) ?? unknown;

const getTypeFromStaticValue = (node, context, options) => {
	if (!options.getStaticType) {
		return unknown;
	}

	const result = getStaticValueForControlFlow(node, context);

	if (!result) {
		return unknown;
	}

	const type = options.getStaticType(result.value, node) ?? unknown;
	return type !== unknown && hasJSDocumentTypeReference(node, context) ? unknown : type;
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
	let typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, definitionScope, options);
	if (definition.name?.optional) {
		typeFromAnnotation = combineUnionTypes([typeFromAnnotation, nullish], options);
	}

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

/**
Get a variable initializer or the default value of a simple parameter binding. A parameter default only describes the omitted-argument case.
*/
function getDefinitionInitializer(definition) {
	if (definition.type === 'Variable') {
		return definition.node.init;
	}

	const parent = definition.name?.parent;
	return definition.type === 'Parameter' && parent?.type === 'AssignmentPattern' && parent.left === definition.name
		? parent.right
		: undefined;
}

const getTypeFromFunctionCall = (node, context, options) => {
	if (node.callee.type !== 'Identifier') {
		return unknown;
	}

	const variable = findVariable(context.sourceCode.getScope(node.callee), node.callee);
	if (
		!variable
		|| variable.defs.length !== 1
		|| variable.references.some(reference => reference.isWrite() && !reference.init)
	) {
		return unknown;
	}

	const [definition] = variable.defs;
	if (definition.name?.typeAnnotation) {
		return unknown;
	}

	const initializer = getDefinitionInitializer(definition);
	const value = definition.type === 'FunctionName' ? definition.node : unwrapTypeScriptExpression(initializer);
	if (value?.async || value?.generator || (definition.type === 'Parameter' && (value?.returnType || hasNativeTypeAssertion(initializer)))) {
		return unknown;
	}

	let functionNode;
	if (definition.type === 'FunctionName') {
		functionNode = definition.node;
	} else if (
		definition.type === 'Variable'
		&& definition.node.id === definition.name
	) {
		let initializer = definition.node.init;
		while (
			initializer?.type === 'TSSatisfiesExpression'
			|| initializer?.type === 'TSNonNullExpression'
		) {
			initializer = initializer.expression;
		}

		if (initializer && isFunction(initializer)) {
			functionNode = initializer;
		}
	}

	if (functionNode?.typeParameters) {
		return unknown;
	}

	if (functionNode?.returnType) {
		return getTypeAnnotationType(functionNode.returnType, context.sourceCode.getScope(functionNode).upper, options);
	}

	const annotation = getJSDocumentTypeAnnotation(definition.name, context);
	if (annotation) {
		return annotation.optional
			? unknown
			: getJSDocumentType({type: getJSDocumentCallableReturnType(annotation.type)}, options);
	}

	return getJSDocumentType(getJSDocumentReturnType(functionNode, context), options);
};

const getClassType = (node, scope, options, visitedTypeReferenceDefinitions) => {
	if (!node.superClass) {
		return nonTarget;
	}

	if (!options.checkClassHeritage) {
		return nonTarget;
	}

	return getClassReferenceTypeFromScope(node.superClass, scope, options, visitedTypeReferenceDefinitions);
};

function getClassReferenceTypeFromScope(node, scope, options, visitedTypeReferenceDefinitions = new Set()) {
	if (node.type === 'Identifier') {
		const typeReferenceName = node.name;
		if (!options.checkClassHeritage) {
			return getKnownTypeReferenceType(typeReferenceName, options);
		}

		const variable = findVariable(scope, typeReferenceName);
		const [definition] = variable?.defs ?? [];
		if (!definition) {
			return getKnownTypeReferenceType(typeReferenceName, options);
		}

		if (visitedTypeReferenceDefinitions.has(definition)) {
			return unknown;
		}

		visitedTypeReferenceDefinitions.add(definition);
		let type = unknown;

		if (
			definition.type === 'Variable'
			&& definition.parent.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
		) {
			type = getClassReferenceTypeFromScope(definition.node.init, variable.scope, options, visitedTypeReferenceDefinitions);
		} else if (definition.type === 'ClassName') {
			type = getClassType(definition.node, variable.scope, options, visitedTypeReferenceDefinitions);
		}

		visitedTypeReferenceDefinitions.delete(definition);

		return type;
	}

	if (classNodeTypes.has(node.type)) {
		return getClassType(node, scope, options, visitedTypeReferenceDefinitions);
	}

	return unknown;
}

const getClassReferenceType = (node, context, options) =>
	getClassReferenceTypeFromScope(node, context.sourceCode.getScope(node), options);

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

		case 'CallExpression': {
			return getTypeFromFunctionCall(node, context, options);
		}

		case 'AssignmentExpression': {
			return node.operator === '=' ? getType(node.right, context, options, visitedVariables) : unknown;
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

			return typeFromAnnotation === unknown && ['TSAnyKeyword', 'TSUnknownKeyword'].includes(node.typeAnnotation.type)
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

		case 'LogicalExpression': {
			return combineUnionTypes([
				getType(node.left, context, options, visitedVariables),
				getType(node.right, context, options, visitedVariables),
			], options);
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

	if (node.typeAnnotation) {
		const typeFromOwnAnnotation = getTypeAnnotationType(node.typeAnnotation, context.sourceCode.getScope(node), options);
		if (typeFromOwnAnnotation !== unknown) {
			return typeFromOwnAnnotation;
		}
	} else {
		const annotation = getJSDocumentTypeAnnotation(node, context);
		if (annotation) {
			const type = getJSDocumentType(annotation, options);
			return type === unknown ? getTypeFromTypeInformation(node, context, options) : type;
		}
	}

	const typeFromExpression = getTypeFromExpression(node, context, options, visitedVariables);
	if (typeFromExpression !== unknown) {
		return typeFromExpression;
	}

	if (node.type !== 'Identifier') {
		const typeFromStaticValue = getTypeFromStaticValue(node, context, options);
		if (typeFromStaticValue !== unknown) {
			return typeFromStaticValue;
		}
	}

	if (options.isTargetNode?.(node, context, node => getType(node, context, options, visitedVariables) === target)) {
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

	// These run on hot nodes, so only copy the options when there is something to override.
	const getOptions = overrides => overrides ? {...options, ...overrides} : options;

	return {
		getType: (node, context, overrides) => normalizeType(getType(node, context, getOptions(overrides))),
		isTarget: (node, context, overrides) => getType(node, context, getOptions(overrides)) === target,
		isKnownNonTarget: (node, context, overrides) => normalizeType(getType(node, context, getOptions(overrides))) === nonTarget,
	};
};

const createBuiltinTypeCheckers = ({
	name,
	aliases = [],
	...options
}) => createTypeCheckers({
	...options,
	targetTypeNames: new Set([name]),
	typeReferenceAliases: new Map(aliases.map(alias => [alias, name])),
	targetConstructorNames: [name],
});

export {
	createBuiltinTypeCheckers,
	createTypeCheckers,
	getTypeName,
	getTypeReferenceDefinition,
	getDefinitionInitializer,
	getJSDocumentType,
	getJSDocumentCallableReturnType,
	getJSDocumentTypeMembers,
	hasJSDocumentTypeReference,
	nonTarget,
	nullish,
	target,
	unknown,
};
