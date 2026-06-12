import {findVariable} from '@eslint-community/eslint-utils';
import typedArray from './shared/typed-array.js';
import {removeMethodCall} from './fix/index.js';
import {
	isCallExpression,
	isNewExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getTypeSymbol,
	isDefaultLibrarySymbol,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-direct-iteration';

const messages = {
	[MESSAGE_ID]: 'Prefer direct iteration instead of `.{{method}}()`.',
};

const arrayType = 'Array';
const mapType = 'Map';
const setType = 'Set';
const formDataType = 'FormData';
const urlSearchParametersType = 'URLSearchParams';

const builtinTypes = new Set([
	arrayType,
	mapType,
	setType,
	formDataType,
	urlSearchParametersType,
	...typedArray,
]);

const typeReferenceAliases = new Map([
	['ReadonlyArray', arrayType],
	['ReadonlyMap', mapType],
	['ReadonlySet', setType],
]);

const defaultIteratorMethodsByType = new Map([
	[arrayType, ['values']],
	[mapType, ['entries']],
	[setType, ['values', 'keys']],
	[formDataType, ['entries']],
	[urlSearchParametersType, ['entries']],
	...typedArray.map(type => [type, ['values']]),
]);

const collectionConstructorNames = [
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
];

const promiseMethods = [
	'all',
	'allSettled',
	'any',
	'race',
];

const iterableConsumingSpreadParents = new Set([
	'ArrayExpression',
	'CallExpression',
	'NewExpression',
]);

const getTypeSet = type => new Set([type]);

const isTypedArrayMethodCall = (node, methods) => isMethodCall(node, {
	objects: typedArray,
	methods,
	optionalCall: false,
	optionalMember: false,
});

const getTypeFromTypeReferenceName = name => {
	if (builtinTypes.has(name)) {
		return name;
	}

	return typeReferenceAliases.get(name);
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

const getTypesFromType = (type, checker, program) => {
	if (type.intrinsicName === 'any' || type.intrinsicName === 'unknown') {
		return;
	}

	if (type.isUnion()) {
		return mergeTypeSets(type.types.map(type => getTypesFromType(type, checker, program)));
	}

	if (checker.isArrayType(type) || checker.isTupleType(type)) {
		return getTypeSet(arrayType);
	}

	const symbol = getTypeSymbol(type);
	if (!isDefaultLibrarySymbol(symbol, program)) {
		return;
	}

	const typeName = symbol.getName();
	const builtinType = typeName && getTypeFromTypeReferenceName(typeName);
	return builtinType && getTypeSet(builtinType);
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
			program.getTypeChecker(),
			program,
		);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this fallback best-effort.
	}
};

const getTypesFromTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypesFromTypeAnnotation(node.typeAnnotation);
		}

		case 'TSArrayType':
		case 'TSTupleType': {
			return getTypeSet(arrayType);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypesFromTypeAnnotation(node.typeAnnotation)
				: undefined;
		}

		case 'TSTypeReference': {
			if (node.typeName.type !== 'Identifier') {
				return;
			}

			const type = getTypeFromTypeReferenceName(node.typeName.name);
			return type && getTypeSet(type);
		}

		case 'TSUnionType': {
			return mergeTypeSets(node.types.map(type => getTypesFromTypeAnnotation(type)));
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
	const annotationTypes = getTypesFromTypeAnnotation(definition.name?.typeAnnotation);
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
	if (node.type === 'ArrayExpression') {
		return getTypeSet(arrayType);
	}

	if (isNewExpression(node, {name: 'Array'})) {
		return getTypeSet(arrayType);
	}

	if (isNewExpression(node, {names: typedArray})) {
		return getTypeSet(node.callee.name);
	}

	if (isNewExpression(node, {names: [mapType, setType, formDataType, urlSearchParametersType]})) {
		return getTypeSet(node.callee.name);
	}

	if (isCallExpression(node, {name: 'Array'})) {
		return getTypeSet(arrayType);
	}

	if (isMethodCall(node, {
		object: 'Array',
		methods: ['from', 'of'],
		optionalCall: false,
		optionalMember: false,
	})) {
		return getTypeSet(arrayType);
	}

	if (isTypedArrayMethodCall(node, ['from', 'of'])) {
		return getTypeSet(node.callee.object.name);
	}

	switch (node.type) {
		case 'Identifier': {
			return getTypesFromVariable(node, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			return getTypesFromTypeAnnotation(node.typeAnnotation) ?? getTypes(node.expression, context, visitedVariables);
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
	getTypesFromSyntax(node, context, visitedVariables) ?? getTypesFromTypeInformation(node, context);

const isDefaultIteratorMethodForTypes = (method, types) => {
	if (!types?.size) {
		return false;
	}

	for (const type of types) {
		const defaultMethods = defaultIteratorMethodsByType.get(type);
		if (!defaultMethods?.includes(method)) {
			return false;
		}
	}

	return true;
};

const isIterableConsumingNewExpression = (node, argument) => (
	node.arguments.length === 1
	&& node.arguments[0] === argument
	&& (
		isNewExpression(node, {names: collectionConstructorNames, argumentsLength: 1})
		|| isNewExpression(node, {names: typedArray, argumentsLength: 1})
	)
);

const isIterableConsumingCallExpression = (node, argument) => {
	if (node.arguments[0] !== argument) {
		return false;
	}

	return (
		isMethodCall(node, {
			object: 'Array',
			method: 'from',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| isTypedArrayMethodCall(node, ['from'])
		|| isMethodCall(node, {
			object: 'Object',
			method: 'fromEntries',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| isMethodCall(node, {
			object: 'Promise',
			methods: promiseMethods,
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
	);
};

const isIterableConsumingSpread = node => {
	const {parent} = node;

	return iterableConsumingSpreadParents.has(parent.type);
};

const isIterableConsumingContext = node => {
	const {parent} = node;

	if (
		parent.type === 'ForOfStatement'
		&& parent.right === node
	) {
		return true;
	}

	if (
		parent.type === 'YieldExpression'
		&& parent.delegate
		&& parent.argument === node
	) {
		return true;
	}

	if (
		parent.type === 'SpreadElement'
		&& parent.argument === node
		&& isIterableConsumingSpread(parent)
	) {
		return true;
	}

	if (parent.type === 'NewExpression') {
		return isIterableConsumingNewExpression(parent, node);
	}

	if (parent.type === 'CallExpression') {
		return isIterableConsumingCallExpression(parent, node);
	}

	return false;
};

const getFix = (node, context) => {
	if (context.sourceCode.getCommentsInside(node).length > 0) {
		return;
	}

	return fixer => removeMethodCall(fixer, node, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods: ['entries', 'keys', 'values'],
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isIterableConsumingContext(node)
		) {
			return;
		}

		const method = node.callee.property.name;
		if (!isDefaultIteratorMethodForTypes(method, getTypes(node.callee.object, context))) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {method},
			fix: getFix(node, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer direct iteration over default iterator method calls.',
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
