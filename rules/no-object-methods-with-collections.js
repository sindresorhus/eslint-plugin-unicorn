import {findVariable} from '@eslint-community/eslint-utils';
import {isNewExpression} from './ast/index.js';
import {
	getParenthesizedText,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isUnknownType,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-object-methods-with-collections/error';
const MESSAGE_ID_SUGGESTION = 'no-object-methods-with-collections/suggestion';

const mapTypes = new Set([
	'Map',
	'ReadonlyMap',
]);

const setTypes = new Set([
	'Set',
	'ReadonlySet',
]);

const collectionTypes = new Set([
	...mapTypes,
	...setTypes,
]);

const objectMethods = new Set([
	'entries',
	'keys',
	'values',
]);

const messages = {
	[MESSAGE_ID_ERROR]: '`Object.{{method}}()` does not return {{type}} contents.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Array.from({{replacement}})`.',
};

const getTypeSet = type => new Set([type]);

const getTypeFromTypeReferenceName = name => collectionTypes.has(name) ? name : undefined;

const typeDeclarationNodeTypes = new Set([
	'ClassDeclaration',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSTypeAliasDeclaration',
]);

const getTypeDeclarationName = node => {
	if (!node || !typeDeclarationNodeTypes.has(node.type)) {
		return;
	}

	return node.id?.name;
};

const getProgramNode = node => {
	while (node.parent) {
		node = node.parent;
	}

	return node.type === 'Program' ? node : undefined;
};

const hasUserDefinedTypeName = (name, node) => {
	const program = getProgramNode(node);
	if (!program) {
		return false;
	}

	for (const node of program.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.specifiers.some(specifier => specifier.local.name === name)) {
				return true;
			}

			continue;
		}

		if (
			node.type === 'ExportNamedDeclaration'
			|| node.type === 'ExportDefaultDeclaration'
		) {
			if (getTypeDeclarationName(node.declaration) === name) {
				return true;
			}

			continue;
		}

		if (getTypeDeclarationName(node) === name) {
			return true;
		}
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

const isUnshadowedGlobalIdentifier = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	return !variable || (variable.scope.type === 'global' && variable.defs.length === 0);
};

const getTypesFromType = (type, program) => {
	if (isUnknownType(type)) {
		return;
	}

	if (type.isUnion()) {
		return mergeTypeSets(type.types.map(type => getTypesFromType(type, program)));
	}

	const symbol = getTypeSymbol(type);
	if (!isDefaultLibrarySymbol(symbol, program)) {
		return;
	}

	const typeName = symbol.getName();
	const collectionType = typeName && getTypeFromTypeReferenceName(typeName);
	return collectionType && getTypeSet(collectionType);
};

const getTypesFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		return getTypesFromType(
			parserServices.getTypeAtLocation(node),
			program,
		);
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

			if (hasUserDefinedTypeName(node.typeName.name, node)) {
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
	if (annotationTypes) {
		return annotationTypes;
	}

	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| !definition.node.init
	) {
		return;
	}

	return getTypes(definition.node.init, context, visitedVariables);
};

const getTypesFromSyntax = (node, context, visitedVariables) => {
	if (
		isNewExpression(node, {names: ['Map', 'Set']})
		&& isUnshadowedGlobalIdentifier(node.callee, context)
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
			return getTypesFromTypeAnnotation(node.typeAnnotation, context) ?? getTypes(node.expression, context, visitedVariables);
		}

		case 'TSNonNullExpression': {
			return getTypes(node.expression, context, visitedVariables);
		}

		case 'ParenthesizedExpression': {
			return getTypes(node.expression, context, visitedVariables);
		}

		default: {
			break;
		}
	}
};

const getTypes = (node, context, visitedVariables = new Set()) =>
	context.sourceCode.parserServices?.program
		? getTypesFromTypeInformation(node, context)
		: getTypesFromSyntax(node, context, visitedVariables);

const getCollectionType = (node, context) => {
	const types = getTypes(node, context);
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

const getMemberObjectText = (node, context) => {
	const text = getParenthesizedText(node, context);
	return shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${text})` : text;
};

const getProblem = (node, context) => {
	const {callee} = node;
	if (
		node.arguments.length !== 1
		|| node.optional
		|| callee.type !== 'MemberExpression'
		|| callee.optional
		|| callee.computed
		|| callee.object.type !== 'Identifier'
		|| callee.object.name !== 'Object'
		|| !isUnshadowedGlobalIdentifier(callee.object, context)
		|| callee.property.type !== 'Identifier'
		|| !objectMethods.has(callee.property.name)
	) {
		return;
	}

	const [argument] = node.arguments;
	const type = getCollectionType(argument, context);
	if (!type) {
		return;
	}

	const method = callee.property.name;
	const replacement = `${getMemberObjectText(argument, context)}.${method}()`;
	const problem = {
		node: callee.property,
		messageId: MESSAGE_ID_ERROR,
		data: {
			method,
			type,
		},
	};

	if (context.sourceCode.getCommentsInside(node).length === 0) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {replacement},
				fix: fixer => fixer.replaceText(node, `Array.from(${replacement})`),
			},
		];
	}

	return problem;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => getProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `Object` methods with `Map` or `Set`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
