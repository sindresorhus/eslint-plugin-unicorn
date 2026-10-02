import {findVariable} from '@eslint-community/eslint-utils';
import {
	getTypeSymbol,
	isGlobalIdentifier,
	isDefaultLibrarySymbol,
	isDefinitionBeforeReference,
	isTypeImportSpecifier,
	isUnknownType,
} from './index.js';

const url = 'url';
const nonUrl = 'non-url';
const unknown = 'unknown';

const urlImportSources = new Set([
	'node:url',
	'url',
]);

const combineTypes = types => {
	if (types.every(type => type === url)) {
		return url;
	}

	if (!types.includes(unknown) && types.includes(nonUrl)) {
		return nonUrl;
	}

	return unknown;
};

const combineUnionTypes = types =>
	types.includes(url) && types.includes(nonUrl) ? unknown : combineTypes(types);

const isUrlImportSource = source =>
	urlImportSources.has(source.value);

const isUrlImport = definition => {
	if (definition.type !== 'ImportBinding') {
		return false;
	}

	const {node, parent} = definition;
	return isUrlImportSource(parent.source)
		&& node.type === 'ImportSpecifier'
		&& node.imported.type === 'Identifier'
		&& node.imported.name === 'URL';
};

const isTypeOnlyImport = definition =>
	definition.type === 'ImportBinding'
	&& (
		definition.parent.importKind === 'type'
		|| isTypeImportSpecifier(definition.node)
	);

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImport(definition);

const hasVisibleValueDefinition = (name, scope, referenceNode, context) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable?.defs.some(definition =>
			!isTypeOnlyDefinition(definition)
			&& isDefinitionBeforeReference(definition, referenceNode, context),
		)) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
};

const isValueUrlImport = definition =>
	isUrlImport(definition)
	&& !isTypeOnlyImport(definition);

const isGlobalUrlConstructor = (node, context) => {
	if (
		node.type !== 'Identifier'
		|| node.name !== 'URL'
	) {
		return false;
	}

	if (hasVisibleValueDefinition('URL', context.sourceCode.getScope(node), node, context)) {
		return false;
	}

	if (isGlobalIdentifier(node, context)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.length > 0
		&& variable.defs.every(definition => isTypeOnlyDefinition(definition));
};

const isImportedUrlConstructor = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition => isValueUrlImport(definition)) ?? false;
};

const isUrlConstructor = (node, context) =>
	isGlobalUrlConstructor(node, context)
	|| isImportedUrlConstructor(node, context);

const isNewUrlExpression = (node, context) =>
	node.type === 'NewExpression'
	&& isUrlConstructor(node.callee, context);

const isKnownNonUrlConstructor = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition =>
		!isTypeOnlyDefinition(definition)
		&& !isValueUrlImport(definition),
	) ?? false;
};

const getDefinitionScope = (definition, context) =>
	context.sourceCode.getScope(definition.name ?? definition.node);

const getTypeReferenceType = (node, context, scope, visitedTypeReferenceNames) => {
	if (node.typeName.type !== 'Identifier') {
		return unknown;
	}

	const typeReferenceName = node.typeName.name;
	// Use the parser's binding to respect forward declarations and function signature scopes.
	const typeVariable = scope.references.find(reference => reference.identifier === node.typeName)?.resolved;
	const [definition] = typeVariable?.defs ?? [];

	if (!definition) {
		return typeReferenceName === 'URL' ? url : unknown;
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return unknown;
	}

	if (isUrlImport(definition)) {
		return url;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	let type = unknown;

	if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		type = getTypeAnnotationType(definition.node.typeAnnotation, context, getDefinitionScope(definition, context), visitedTypeReferenceNames);
	} else if (definition.type === 'ClassName') {
		type = nonUrl;
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return type;
};

const getTypeAnnotationType = (node, context, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, context, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, context, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, context, scope, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineTypes(node.types.map(type => getTypeAnnotationType(type, context, scope, visitedTypeReferenceNames)));
		}

		case 'TSImportType': {
			return isUrlImportSource(node.source)
				&& node.qualifier?.type === 'Identifier'
				&& node.qualifier.name === 'URL'
				? url
				: nonUrl;
		}

		default: {
			return node ? nonUrl : unknown;
		}
	}
};

const getTypeScriptUrlType = (type, state) => {
	const {checker, program} = state;

	if (isUnknownType(type)) {
		return unknown;
	}

	if (type.isTypeParameter?.()) {
		return unknown;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getTypeScriptUrlType(constraint, state);
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getTypeScriptUrlType(type, state)));
	}

	if (type.isIntersection()) {
		return combineTypes(type.types.map(type => getTypeScriptUrlType(type, state)));
	}

	const symbol = getTypeSymbol(type);
	if (isDefaultLibrarySymbol(symbol, program) && symbol.getName() === 'URL') {
		return url;
	}

	return nonUrl;
};

const getTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const {program} = parserServices;
		return getTypeScriptUrlType(
			parserServices.getTypeAtLocation(node),
			{
				checker: program.getTypeChecker(),
				program,
			},
		);
	} catch {
		return unknown;
	}
};

const getTypeFromVariable = (node, context, visitedVariables) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return unknown;
	}

	const [definition] = variable.defs;
	if (!isDefinitionBeforeReference(definition, node, context)) {
		return unknown;
	}

	visitedVariables.add(variable);

	const typeFromInitializer = definition.type === 'Variable'
		&& definition.node.id.type === 'Identifier'
		&& definition.parent.kind === 'const'
		&& definition.node.init
		? getUrlType(definition.node.init, context, visitedVariables)
		: unknown;
	const typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, context, getDefinitionScope(definition, context));

	visitedVariables.delete(variable);

	return typeFromInitializer === unknown ? typeFromAnnotation : typeFromInitializer;
};

const getTypeFromFunctionReturn = (node, context) => {
	if (
		node.type !== 'CallExpression'
		|| node.callee.type !== 'Identifier'
	) {
		return unknown;
	}

	const variable = findVariable(context.sourceCode.getScope(node.callee), node.callee);
	if (variable?.defs.length !== 1) {
		return unknown;
	}

	const [definition] = variable.defs;
	return getTypeAnnotationType(definition.node.returnType, context, getDefinitionScope(definition, context));
};

function getUrlType(node, context, visitedVariables = new Set()) {
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

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, context, scope);

			return typeFromAnnotation === unknown
				? getUrlType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getUrlType(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getUrlType(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineTypes([
				getUrlType(node.consequent, context, visitedVariables),
				getUrlType(node.alternate, context, visitedVariables),
			]);
		}

		default: {
			break;
		}
	}

	if (isNewUrlExpression(node, context)) {
		return url;
	}

	if (node.type === 'NewExpression') {
		if (isKnownNonUrlConstructor(node.callee, context)) {
			return nonUrl;
		}

		const typeFromTypeInformation = getTypeFromTypeInformation(node, context);
		return typeFromTypeInformation === unknown ? nonUrl : typeFromTypeInformation;
	}

	const typeFromFunctionReturn = getTypeFromFunctionReturn(node, context);
	if (typeFromFunctionReturn !== unknown) {
		return typeFromFunctionReturn;
	}

	return getTypeFromTypeInformation(node, context);
}

/**
Check whether an expression is a known native URL.
*/
const isUrl = (node, context) =>
	getUrlType(node, context) === url;

/**
Check whether an expression constructs a fresh native URL.
*/
const isFreshUrl = (node, context) => {
	switch (node.type) {
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'ParenthesizedExpression':
		case 'TSNonNullExpression': {
			return isFreshUrl(node.expression, context);
		}

		case 'SequenceExpression': {
			return isFreshUrl(node.expressions.at(-1), context);
		}

		case 'ConditionalExpression': {
			return isFreshUrl(node.consequent, context)
				&& isFreshUrl(node.alternate, context);
		}

		case 'NewExpression': {
			return isNewUrlExpression(node, context);
		}

		default: {
			return false;
		}
	}
};

export default isUrl;
export {isFreshUrl};
