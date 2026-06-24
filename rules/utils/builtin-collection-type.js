import {findVariable} from '@eslint-community/eslint-utils';
import {isNewExpression} from '../ast/index.js';
import isGlobalIdentifier from './is-global-identifier.js';
import {
	getTypeSymbol,
	isUnknownType,
} from './types.js';

const mapTypes = new Set([
	'Map',
	'ReadonlyMap',
]);

const setTypes = new Set([
	'Set',
	'ReadonlySet',
]);

const collectionTypes = mapTypes.union(setTypes);

const getTypeSet = type => new Set([type]);

const getTypeFromTypeReferenceName = name => collectionTypes.has(name) ? name : undefined;

const typeReferenceDefinitionTypes = new Set([
	'ClassName',
	'ImportBinding',
	'TSEnumName',
	'Type',
]);

const hasUserDefinedTypeName = (name, node, context) => {
	let scope = context.sourceCode.getScope(node);

	while (scope) {
		const definition = scope.set
			.get(name)
			?.defs
			.find(definition => typeReferenceDefinitionTypes.has(definition.type));

		if (definition) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
};

const mergeTypeSets = typeSets => {
	const types = new Set();

	for (const typeSet of typeSets) {
		if (!typeSet) {
			return;
		}

		for (const type of typeSet) {
			types.add(type);
		}
	}

	return types;
};

const isDefaultLibraryOnlySymbol = (symbol, program) =>
	symbol?.declarations?.length > 0
	&& symbol.declarations.every(declaration => program.isSourceFileDefaultLibrary(declaration.getSourceFile()));

const getTypesFromType = (type, program) => {
	if (isUnknownType(type)) {
		return;
	}

	if (type.isUnion()) {
		return mergeTypeSets(type.types.map(type => getTypesFromType(type, program)));
	}

	const symbol = getTypeSymbol(type);
	if (!isDefaultLibraryOnlySymbol(symbol, program)) {
		return;
	}

	const typeName = symbol.getName();
	const collectionType = typeName && getTypeFromTypeReferenceName(typeName);
	return collectionType && getTypeSet(collectionType);
};

const hasUserDefinedCollectionType = (types, node, context) => {
	for (const type of types) {
		if (hasUserDefinedTypeName(type, node, context)) {
			return true;
		}
	}

	return false;
};

const getTypesFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		const types = getTypesFromType(
			parserServices.getTypeAtLocation(node),
			program,
		);

		if (types && !hasUserDefinedCollectionType(types, node, context)) {
			return types;
		}
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this fallback best-effort.
	}
};

const getTypesFromTypeAnnotation = (node, context) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypesFromTypeAnnotation(node.typeAnnotation, context);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypesFromTypeAnnotation(node.typeAnnotation, context)
				: undefined;
		}

		case 'TSTypeReference': {
			if (node.typeName.type !== 'Identifier') {
				return;
			}

			if (hasUserDefinedTypeName(node.typeName.name, node, context)) {
				return;
			}

			const type = getTypeFromTypeReferenceName(node.typeName.name);
			return type && getTypeSet(type);
		}

		case 'TSUnionType': {
			return mergeTypeSets(node.types.map(type => getTypesFromTypeAnnotation(type, context)));
		}

		default: {
			break;
		}
	}
};

const getTypesFromVariable = (node, context, visitedVariables) => {
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
	const annotationTypes = getTypesFromTypeAnnotation(definition.name?.typeAnnotation, context);
	let types;

	if (annotationTypes) {
		types = annotationTypes;
	} else if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.init
	) {
		types = getBuiltinCollectionTypes(definition.node.init, context, visitedVariables);
	}

	visitedVariables.delete(variable);

	return types;
};

const getTypesFromConditionalExpression = (node, context, visitedVariables) =>
	mergeTypeSets([
		getBuiltinCollectionTypes(node.consequent, context, visitedVariables),
		getBuiltinCollectionTypes(node.alternate, context, visitedVariables),
	]);

const getTypesFromSyntax = (node, context, visitedVariables) => {
	if (
		isNewExpression(node, {names: ['Map', 'Set']})
		&& isGlobalIdentifier(node.callee, context)
	) {
		return getTypeSet(node.callee.name);
	}

	switch (node.type) {
		case 'Identifier': {
			return getTypesFromVariable(node, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			return getTypesFromTypeAnnotation(node.typeAnnotation, context) ?? getBuiltinCollectionTypes(node.expression, context, visitedVariables);
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getBuiltinCollectionTypes(node.expression, context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return getTypesFromConditionalExpression(node, context, visitedVariables);
		}

		default: {
			break;
		}
	}
};

const getBuiltinCollectionTypes = (node, context, visitedVariables = new Set()) =>
	getTypesFromTypeInformation(node, context)
	?? getTypesFromSyntax(node, context, visitedVariables);

const getBuiltinCollectionType = (node, context) => {
	const types = getBuiltinCollectionTypes(node, context);
	if (!types?.size) {
		return;
	}

	let hasMapType = false;
	let hasSetType = false;

	for (const type of types) {
		if (mapTypes.has(type)) {
			hasMapType = true;
			continue;
		}

		if (setTypes.has(type)) {
			hasSetType = true;
			continue;
		}

		return;
	}

	if (hasMapType && hasSetType) {
		return;
	}

	return hasMapType ? 'Map' : 'Set';
};

const isBuiltinSet = (node, context) => getBuiltinCollectionType(node, context) === 'Set';

export {
	getBuiltinCollectionType,
	isBuiltinSet,
};
