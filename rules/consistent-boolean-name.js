import {isRegExp} from 'node:util/types';
import {findVariable, getPropertyName, getStaticValue} from '@eslint-community/eslint-utils';
import {renameVariable} from './fix/index.js';
import {combineBooleanStates, getPromisedTypeBooleanState, getTypeBooleanState} from './utils/get-type-boolean-state.js';
import resolveVariableName from './utils/resolve-variable-name.js';
import {getBooleanWrapperVariableState} from './utils/get-boolean-wrapper-variable-state.js';
import {
	getAvailableVariableName,
	getScopes,
	getVariableIdentifiers,
	isReactHookName,
	lowerFirst,
	upperFirst,
} from './utils/index.js';
import {
	isBooleanExpression,
	isBooleanFunction,
	isBooleanFunctionReference,
	isBooleanFunctionTypeAnnotation,
	isBooleanTypeAnnotation,
	isFunctionTypeAnnotation,
} from './utils/is-boolean.js';

const MESSAGE_ID = 'consistent-boolean-name';
const MESSAGE_ID_NON_BOOLEAN_PREFIX = 'non-boolean-prefix';
const MESSAGE_ID_SUGGESTION = 'rename';
const REMOVED_CHECK_PROPERTIES_MESSAGE = '`checkProperties` was removed. Use `checkMethods` and `checkFields` instead.';
const [ALWAYS, PROHIBIT, NEVER] = ['always', 'prohibit', 'never'];
const messages = {
	[MESSAGE_ID]: 'Boolean name `{{name}}` should start with {{prefixes}}.',
	[MESSAGE_ID_NON_BOOLEAN_PREFIX]: '`{{name}}` starts with `{{prefix}}`, so it should be boolean.',
	[MESSAGE_ID_SUGGESTION]: 'Rename to `{{replacement}}`.',
};

const defaultPrefixes = {
	is: true,
	are: true,
	has: true,
	have: true,
	can: true,
	should: true,
	was: true,
	were: true,
	did: true,
	will: true,
	// `requireLogin()` reads like an action or assertion, not a boolean.
	requires: true,
};

const getEnabledPrefixes = ({prefixes = {}} = {}) =>
	Object.entries({
		...defaultPrefixes,
		...prefixes,
	})
		.filter(([, enabled]) => enabled)
		.map(([prefix]) => prefix);

const formatPrefixes = prefixes =>
	prefixes.map(prefix => `\`${prefix}\``).join(', ');

const booleanBinaryOperators = new Set([
	'>',
	'>=',
	'<',
	'<=',
	'==',
	'===',
	'!=',
	'!==',
	'in',
	'instanceof',
]);
const boolean = 'boolean';
const nonBoolean = 'non-boolean';
const unknown = 'unknown';
const nullishTypeAnnotationTypes = new Set([
	'TSNullKeyword',
	'TSUndefinedKeyword',
]);
const unknownTypeAnnotationTypes = new Set([
	'TSAnyKeyword',
	'TSNeverKeyword',
	'TSUnknownKeyword',
	'TSConditionalType',
]);
const promiseValueTypeNames = new Set(['Promise', 'PromiseLike']);
const nonBooleanExpressionTypes = new Set([
	'ArrayExpression',
	'ObjectExpression',
	'ClassExpression',
	'NewExpression',
	'TemplateLiteral',
	'UpdateExpression',
]);
const expressionWrapperTypes = new Set([
	'AwaitExpression',
	'TSNonNullExpression',
	'ParenthesizedExpression',
]);
const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSTypeAssertion',
	'TSSatisfiesExpression',
]);
const logicalAssignmentOperators = new Set(['&&=', '||=', '??=']);
const isUpperCase = string => string === string.toUpperCase();
const stripLeadingUnderscores = name => name.replace(/^_+/, '');
const isScreamingCase = name => /^[A-Z][\dA-Z_]*$/.test(stripLeadingUnderscores(name));
const hasReactReferenceSuffix = name => /(?:Ref|Reference)$/.test(stripLeadingUnderscores(name));

const isFunction = node => [
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
	'TSDeclareFunction',
].includes(node?.type);

const propertyDefinitionTypes = new Set([
	'PropertyDefinition',
	'AccessorProperty',
	'TSAbstractPropertyDefinition',
	'TSAbstractAccessorProperty',
]);
const methodDefinitionTypes = new Set(['MethodDefinition', 'TSAbstractMethodDefinition']);
const typeScriptMemberTypes = new Set(['TSMethodSignature', 'TSPropertySignature']);
const isSetter = node => node?.kind === 'set' || node?.parent?.kind === 'set';

const unwrapParameter = node => node.type === 'TSParameterProperty'
	? node.parameter
	: node;

const isSameNode = (a, b) =>
	a?.range[0] === b?.range[0]
	&& a?.range[1] === b?.range[1];

function findParameter(parameters, identifier) {
	for (const parameter of parameters) {
		const unwrappedParameter = unwrapParameter(parameter);
		const parameterName = unwrappedParameter.type === 'AssignmentPattern'
			? unwrappedParameter.left
			: unwrappedParameter;

		if (isSameNode(parameterName, identifier)) {
			return unwrappedParameter;
		}
	}
}

const prepareOptions = options => {
	if (Object.hasOwn(options ?? {}, 'checkProperties')) {
		throw new Error(REMOVED_CHECK_PROPERTIES_MESSAGE);
	}

	const {
		checkVariables,
		checkArguments,
		checkFunctions,
		checkMethods,
		checkFields,
		prefixes,
		ignore,
		wrappers,
	} = options ?? {};

	const preparedOptions = {
		checkVariables,
		checkArguments,
		checkFunctions,
		checkMethods,
		checkFields,
		prefixes: getEnabledPrefixes({prefixes}),
		ignore: ignore.map(pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u')),
		wrappers: new Map(Object.entries(wrappers)),
	};

	return preparedOptions;
};

function isIgnoredName(name, ignore) {
	return ignore.some(regexp => {
		regexp.lastIndex = 0;
		const isIgnored = regexp.test(name);
		regexp.lastIndex = 0;
		return isIgnored;
	});
}

function getBooleanPrefix(name, prefixes) {
	name = stripLeadingUnderscores(name);

	for (const prefix of prefixes) {
		if (name.startsWith(`${prefix.toUpperCase()}_`)) {
			return prefix;
		}

		if (
			name.startsWith(prefix)
			&& name.length > prefix.length
			&& /[\dA-Z_]/.test(name[prefix.length])
		) {
			return prefix;
		}
	}
}

function getReplacementName(name, prefix) {
	const leadingUnderscores = name.match(/^_*/)[0];
	const nameWithoutLeadingUnderscores = stripLeadingUnderscores(name);

	return isUpperCase(nameWithoutLeadingUnderscores)
		? `${leadingUnderscores}${prefix.toUpperCase()}_${nameWithoutLeadingUnderscores}`
		: `${leadingUnderscores}${prefix}${upperFirst(nameWithoutLeadingUnderscores)}`;
}

function getReactHookReplacementName({name, nameForPrefixCheck}, prefix) {
	if (name === nameForPrefixCheck) {
		return getReplacementName(name, prefix);
	}

	const hookName = isScreamingCase(nameForPrefixCheck)
		? getReplacementName(nameForPrefixCheck, prefix)
		: `${prefix}${upperFirst(nameForPrefixCheck)}`;

	return `use${upperFirst(hookName)}`;
}

const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration'
			&& identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		identifier.parent.type === 'ExportSpecifier'
		&& identifier.parent.local === identifier
		&& identifier.parent.local === identifier.parent.exported
	) {
		return true;
	}

	if (
		identifier.parent.type === 'FunctionDeclaration'
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const isExportSpecifierLocal = identifier =>
	identifier.parent.type === 'ExportSpecifier'
	&& identifier.parent.local === identifier;

const isExportDefaultIdentifier = identifier =>
	identifier.parent.type === 'ExportDefaultDeclaration'
	&& identifier.parent.declaration === identifier;

const shouldSuggestRename = variable => getVariableIdentifiers(variable)
	.every(identifier =>
		!isExportedIdentifier(identifier)
		&& identifier.type !== 'JSXIdentifier',
	);

function isDestructuredDefinition(definition) {
	for (let node = definition.name; node && node !== definition.node; node = node.parent) {
		if (
			node.type === 'ObjectPattern'
			|| node.type === 'ArrayPattern'
		) {
			return true;
		}
	}

	return false;
}

const isDestructuredVariable = variable =>
	variable.defs.length > 0
	&& variable.defs.every(definition => isDestructuredDefinition(definition));

function isParameterPropertyDefinition(definition) {
	return definition.type === 'Parameter'
		&& definition.node.params.some(parameter =>
			parameter.type === 'TSParameterProperty'
			&& isSameNode(getParameterPropertyNameNode(parameter), definition.name),
		);
}

const hasWriteAfterInitialization = variable =>
	variable.references.some(reference => !reference.init && reference.isWrite());

const isBooleanAsyncFunction = (node, context) =>
	getPromisedTypeAnnotationBooleanState(node.returnType, context, context.sourceCode.getScope(node), {allowNullish: false}) === boolean
	|| getAsyncFunctionTypeInformationBooleanState(node, context, false) === boolean;

function getAsyncFunctionTypeAnnotationBooleanState(node, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	if (!normalizedTypeState.functionTypesAreBoolean || !isCallableTypeAnnotation(node, context, scope)) {
		return unknown;
	}

	const state = getPromisedTypeAnnotationBooleanState(node, context, scope, {
		...normalizedTypeState,
		allowNullish: false,
	});
	if (
		state !== unknown
		|| !context.sourceCode.parserServices?.program
		|| hasNullableType(node, context)
		|| hasUnresolvedTypeParameterReference(node, normalizedTypeState, scope, false)
	) {
		return state;
	}

	return getAsyncFunctionTypeInformationBooleanState(node, context, false);
}

const isBooleanAsyncFunctionTypeAnnotation = (node, context, scope) =>
	getAsyncFunctionTypeAnnotationBooleanState(node, context, scope) === boolean;

const isBooleanFunctionLikeTypeAnnotation = (node, context, scope) =>
	isBooleanFunctionTypeAnnotation(node, context, scope)
	|| isBooleanAsyncFunctionTypeAnnotation(node, context, scope)
	|| (
		isCallableTypeAnnotation(node, context, scope)
		&& getDirectTypeAnnotationBooleanState(node, context, scope, {allowNullish: false}) === boolean
	);

const isBooleanFunctionValue = (node, context) => {
	if (node.async) {
		return isBooleanAsyncFunction(node, context);
	}

	const scope = context.sourceCode.getScope(node);
	return getDirectTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false, allowNullish: false}) === boolean
		|| isBooleanFunction(node, context);
};

const isBooleanFunctionDefinition = (definition, context, isAsync = definition.node.async) =>
	definition.type === 'FunctionName'
	&& isFunction(definition.node)
	&& (isAsync
		? isBooleanAsyncFunction(definition.node, context)
		: isBooleanFunctionValue(definition.node, context));

const isBooleanAsyncFunctionReference = (node, context) => {
	if (node?.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| hasWriteAfterInitialization(variable)
	) {
		return false;
	}

	const functionDefinitions = getFunctionDefinitions(variable);
	if (functionDefinitions) {
		return hasAsyncFunctionImplementation(variable.defs)
			&& functionDefinitions.every(definition => isBooleanFunctionDefinition(definition, context, true));
	}

	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	const scope = context.sourceCode.getScope(definition.name);
	if (isBooleanAsyncFunctionTypeAnnotation(definition.name?.typeAnnotation, context, scope)) {
		return true;
	}

	if (definition.type === 'FunctionName') {
		return isBooleanFunctionDefinition(definition, context);
	}

	return definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.init?.async
		&& isBooleanAsyncFunction(definition.node.init, context);
};

const isBooleanValue = (node, context) => isFunction(node)
	? isBooleanFunctionValue(node, context)
	: isBooleanFunctionReference(node, context)
		|| isBooleanAsyncFunctionReference(node, context)
		|| isBooleanExpression(node, context);

function getSupportedVariableDefinition(variable) {
	if (variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	const {name} = definition;

	if (
		name?.type !== 'Identifier'
		|| !['Variable', 'Parameter', 'FunctionName'].includes(definition.type)
		|| (definition.type === 'Variable' && definition.node.id.type !== 'Identifier')
		|| (definition.type === 'Parameter' && isSetter(definition.node))
	) {
		return;
	}

	return definition;
}

function getVariableOption(variable) {
	if (getFunctionDefinitions(variable)) {
		return 'checkFunctions';
	}

	const definition = getSupportedVariableDefinition(variable);
	if (!definition) {
		return;
	}

	return {
		Variable: 'checkVariables',
		Parameter: 'checkArguments',
		FunctionName: 'checkFunctions',
	}[definition.type];
}

function getFunctionDefinitions(variable) {
	if (
		variable.defs.length <= 1
		|| variable.defs.some(definition => definition.type !== 'FunctionName')
	) {
		return;
	}

	const overloadDefinitions = variable.defs.filter(definition => definition.node.type === 'TSDeclareFunction');
	return overloadDefinitions.length > 0 ? overloadDefinitions : variable.defs;
}

function hasAsyncFunctionImplementation(definitions) {
	return definitions.some(definition => isFunction(definition.node) && definition.node.async);
}

function hasGeneratorFunctionImplementation(definitions) {
	return definitions.some(definition => isFunction(definition.node) && definition.node.generator);
}

function isReactHookFunctionBinding(variable, context) {
	if (
		variable.name === 'use'
		|| !isReactHookName(variable.name)
	) {
		return false;
	}

	if (getFunctionDefinitions(variable)) {
		return true;
	}

	const definition = getSupportedVariableDefinition(variable);

	if (definition?.type === 'FunctionName') {
		return isFunction(definition.node);
	}

	return definition?.type === 'Variable'
		&& (
			isFunction(definition.node.init)
			|| isCallableTypeAnnotation(definition.name.typeAnnotation, context, context.sourceCode.getScope(definition.name))
		);
}

function getNameForPrefixCheck(variable, context) {
	if (!isReactHookFunctionBinding(variable, context)) {
		return variable.name;
	}

	const hookName = variable.name.slice(3);

	return isScreamingCase(hookName) ? hookName : lowerFirst(hookName);
}

function isReactUseReferenceCall(node) {
	if (node?.type !== 'CallExpression') {
		return false;
	}

	const {callee} = node;
	if (callee.type === 'Identifier') {
		return callee.name === 'useRef';
	}

	return callee.type === 'MemberExpression'
		&& !callee.computed
		&& !callee.optional
		&& callee.object.type === 'Identifier'
		&& callee.object.name === 'React'
		&& callee.property.type === 'Identifier'
		&& callee.property.name === 'useRef';
}

function isDirectVueFunctionReference(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);

	return !variable
		|| variable.defs.every(definition =>
			(
				definition.type === 'ImportBinding'
				&& definition.node.type === 'ImportSpecifier'
				&& definition.parent.type === 'ImportDeclaration'
				&& definition.parent.source.value === 'vue'
				&& definition.node.imported.type === 'Identifier'
				&& definition.node.imported.name === node.name
			)
			|| isInDeclareContext(definition.node),
		);
}

function isBooleanReactReferenceVariable(variable, context) {
	const definition = getSupportedVariableDefinition(variable);

	return definition?.type === 'Variable'
		&& !hasWriteAfterInitialization(variable)
		&& hasReactReferenceSuffix(variable.name)
		&& isReactUseReferenceCall(definition.node.init)
		&& getExpressionBooleanState(definition.node.init.arguments[0], context, new Set(), false) === boolean;
}

function unwrapVueComputedGetter(node) {
	while (
		node?.type === 'ParenthesizedExpression'
		|| node?.type === 'TSNonNullExpression'
		|| typeScriptExpressionWrapperTypes.has(node?.type)
	) {
		node = node.expression;
	}

	return node;
}

function isBooleanVueReferenceVariable(variable, context) {
	const definition = getSupportedVariableDefinition(variable);
	const callExpression = definition?.type === 'Variable' ? definition.node.init : undefined;
	if (
		callExpression?.type !== 'CallExpression'
		|| callExpression.callee.type !== 'Identifier'
		|| !isDirectVueFunctionReference(callExpression.callee, context)
		|| hasWriteAfterInitialization(variable)
	) {
		return false;
	}

	const [argument] = callExpression.arguments;
	if (callExpression.callee.name === 'ref') {
		return getExpressionBooleanState(argument, context, new Set(), false) === boolean;
	}

	const getter = unwrapVueComputedGetter(argument);
	return callExpression.callee.name === 'computed'
		&& (
			(isFunction(getter) && !getter.async && !getter.generator)
			|| isBooleanFunctionReference(getter, context)
		)
		&& getExpressionBooleanState(argument, context) === boolean;
}

function combineVariableBooleanStates(states) {
	if (states.includes(nonBoolean)) {
		return nonBoolean;
	}

	return combineBooleanStates(states);
}

function getTypeInformationBooleanState(node, context, functionTypesAreBoolean = true, allowNullish = true) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const type = parserServices.getTypeAtLocation(node);
		const nonNullableType = checker.getNonNullableType(type);
		if (!allowNullish && nonNullableType !== type) {
			return unknown;
		}

		if (!allowNullish && hasNullableType(node, context)) {
			return unknown;
		}

		return getTypeBooleanState(
			type,
			checker,
			new Set(),
			functionTypesAreBoolean,
		);
	} catch {
		return unknown;
	}
}

function hasNullableType(node, context) {
	if (!node) {
		return false;
	}

	if (
		node.type === 'TSTypeAnnotation'
		|| node.type === 'TSParenthesizedType'
	) {
		return hasNullableType(node.typeAnnotation, context);
	}

	if (node.type === 'TSUnionType' && node.types.some(type => nullishTypeAnnotationTypes.has(type.type))) {
		return true;
	}

	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const hasNullishType = (type, visitedTypes = new Set()) => {
			if (!type || visitedTypes.has(type)) {
				return false;
			}

			visitedTypes.add(type);
			if (checker.getNonNullableType(type) !== type) {
				return true;
			}

			if (type.isUnion() && type.types.some(type => hasNullishType(type, visitedTypes))) {
				return true;
			}

			const promisedType = checker.getPromisedTypeOfPromise(type);
			if (promisedType && hasNullishType(promisedType, visitedTypes)) {
				return true;
			}

			return type.getCallSignatures().some(signature => hasNullishType(signature.getReturnType(), visitedTypes));
		};

		return hasNullishType(parserServices.getTypeAtLocation(node));
	} catch {
		return false;
	}
}

function getPromisedTypeInformationBooleanState(node, context, allowNullish = true) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const type = parserServices.getTypeAtLocation(node);
		const nonNullableType = checker.getNonNullableType(type);
		if (!allowNullish && nonNullableType !== type) {
			return unknown;
		}

		if (!allowNullish && hasNullableType(node, context)) {
			return unknown;
		}

		return getPromisedTypeBooleanState(nonNullableType, checker);
	} catch {
		return unknown;
	}
}

function getTypeReferenceName(typeName) {
	if (typeName?.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName?.type === 'TSQualifiedName') {
		const left = getTypeReferenceName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
}

const getTypeDefinitions = (name, scope) =>
	(resolveVariableName(name, scope)?.defs ?? []).filter(definition => definition.type === 'Type');
const getInterfaceDefinitions = (name, scope) =>
	getTypeDefinitions(name, scope).filter(definition => definition.node.type === 'TSInterfaceDeclaration');

function getPromisedInterfaceState(interfaceNode, context, scope, {visitedTypeReferenceNames, typeState}) {
	let hasCallSignature = false;
	for (const member of interfaceNode.body.body) {
		if (member.type !== 'TSCallSignatureDeclaration') {
			continue;
		}

		hasCallSignature = true;
		if (!isPromisedTypeAnnotation(member.returnType, context, scope, {visitedTypeReferenceNames, typeState})) {
			return false;
		}
	}

	for (const heritage of interfaceNode.extends ?? []) {
		const name = getTypeReferenceName(heritage.expression);
		if (!name || visitedTypeReferenceNames.has(name)) {
			continue;
		}

		const nextVisitedTypeReferenceNames = new Set(visitedTypeReferenceNames);
		nextVisitedTypeReferenceNames.add(name);
		for (const definition of getTypeDefinitions(name, scope)) {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...typeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(heritage), typeState),
			};
			if (definition.node.type === 'TSInterfaceDeclaration') {
				const state = getPromisedInterfaceState(definition.node, context, definitionScope, {
					visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
					typeState: definitionTypeState,
				});
				if (state === false) {
					return false;
				}

				if (state === true) {
					hasCallSignature = true;
				}
			} else if (definition.node.type === 'TSTypeAliasDeclaration') {
				const returnTypes = getCallSignatureReturnTypes(definition.node.typeAnnotation, context, definitionScope, {typeState: definitionTypeState});
				if (returnTypes.length > 0) {
					hasCallSignature = true;
					const hasNonPromisedReturnType = returnTypes.some(returnType => !isPromisedTypeAnnotation(returnType, context, definitionScope, {
						visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
						typeState: definitionTypeState,
					}));
					if (hasNonPromisedReturnType) {
						return false;
					}
				}
			}
		}
	}

	return hasCallSignature ? true : undefined;
}

function getTypeArguments(node) {
	while (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		node = node.typeAnnotation;
	}

	return node?.typeArguments?.params ?? node?.typeParameters?.params;
}

function hasMissingRequiredTypeArguments(node, scope) {
	while (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		node = node.typeAnnotation;
	}

	if (node?.type !== 'TSTypeReference') {
		return false;
	}

	const name = getTypeReferenceName(node.typeName);
	if (!name) {
		return false;
	}

	const typeArguments = getTypeArguments(node) ?? [];
	return getTypeDefinitions(name, scope).some(definition =>
		(definition.node.typeParameters?.params ?? []).some((parameter, index) => index >= typeArguments.length && !parameter.default),
	);
}

function getCallSignatureReturnTypesFromDefinition(definition, context, scope, {typeArguments, typeState, visitedTypeReferenceNames} = {}) {
	const definitionScope = context.sourceCode.getScope(definition.node);
	const definitionTypeState = {
		...typeState,
		typeParameterTypes: getTypeParameterTypes(definition.node, typeArguments, typeState),
	};
	if (definition.node.type === 'TSInterfaceDeclaration') {
		return getCallSignatureReturnTypes(definition.node, context, definitionScope, {
			typeState: definitionTypeState,
			visitedTypeReferenceNames,
		});
	}

	return definition.node.type === 'TSTypeAliasDeclaration'
		? getCallSignatureReturnTypes(definition.node.typeAnnotation, context, definitionScope, {
			typeState: definitionTypeState,
			visitedTypeReferenceNames,
		})
		: [];
}

function getCallSignatureReturnTypes(node, context, scope, {typeState = getTypeState(), visitedTypeReferenceNames = new Set()} = {}) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return [];
	}

	if (
		node?.type === 'TSParenthesizedType'
		|| node?.type === 'TSTypeAnnotation'
	) {
		return getCallSignatureReturnTypes(node.typeAnnotation, context, scope, {typeState, visitedTypeReferenceNames});
	}

	if (node?.type === 'TSFunctionType') {
		return [resolveTypeParameterType(node.returnType, typeState)];
	}

	if (node?.type === 'TSTypeLiteral') {
		return node.members
			.filter(member => member.type === 'TSCallSignatureDeclaration')
			.map(member => resolveTypeParameterType(member.returnType, typeState));
	}

	if (node?.type === 'TSIntersectionType') {
		return node.types.flatMap(type => getCallSignatureReturnTypes(type, context, scope, {typeState, visitedTypeReferenceNames}));
	}

	if (node?.type === 'TSInterfaceDeclaration') {
		const returnTypes = node.body.body
			.filter(member => member.type === 'TSCallSignatureDeclaration')
			.map(member => resolveTypeParameterType(member.returnType, typeState));

		for (const heritage of node.extends ?? []) {
			const name = getTypeReferenceName(heritage.expression);
			if (!name || visitedTypeReferenceNames.has(name)) {
				continue;
			}

			const nextVisitedTypeReferenceNames = new Set(visitedTypeReferenceNames);
			nextVisitedTypeReferenceNames.add(name);
			for (const definition of getTypeDefinitions(name, scope)) {
				returnTypes.push(...getCallSignatureReturnTypesFromDefinition(definition, context, scope, {
					typeArguments: getTypeArguments(heritage),
					typeState,
					visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
				}));
			}
		}

		return returnTypes;
	}

	if (node?.type === 'TSTypeReference') {
		const name = getTypeReferenceName(node.typeName);
		if (!name || visitedTypeReferenceNames.has(name)) {
			return [];
		}

		const nextVisitedTypeReferenceNames = new Set(visitedTypeReferenceNames);
		nextVisitedTypeReferenceNames.add(name);
		return getTypeDefinitions(name, scope).flatMap(definition => getCallSignatureReturnTypesFromDefinition(definition, context, scope, {
			typeArguments: getTypeArguments(node),
			typeState,
			visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
		}));
	}

	return [];
}

function isPromisedTypeReference(node, context, scope, {visitedTypeReferenceNames, typeState}) {
	const name = getTypeReferenceName(node.typeName);
	if (!name || visitedTypeReferenceNames.has(name)) {
		return false;
	}

	if (isGlobalPromiseTypeReference(node, scope)) {
		return true;
	}

	const definitions = getTypeDefinitions(name, scope);
	if (definitions.length === 0) {
		return false;
	}

	const nextVisitedTypeReferenceNames = new Set(visitedTypeReferenceNames);
	nextVisitedTypeReferenceNames.add(name);
	const states = new Set(definitions.map(definition => {
		const definitionScope = context.sourceCode.getScope(definition.node);
		const definitionTypeState = {
			...typeState,
			typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(node), typeState),
		};

		if (definition.node.type === 'TSTypeAliasDeclaration') {
			return isPromisedTypeAnnotation(definition.node.typeAnnotation, context, definitionScope, {
				visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
				typeState: definitionTypeState,
			});
		}

		return definition.node.type === 'TSInterfaceDeclaration'
			? getPromisedInterfaceState(definition.node, context, definitionScope, {
				visitedTypeReferenceNames: nextVisitedTypeReferenceNames,
				typeState: definitionTypeState,
			})
			: false;
	}));

	return states.has(true) && !states.has(false);
}

function isPromisedTypeAnnotation(node, context, scope, {visitedTypeReferenceNames = new Set(), typeState = getTypeState()} = {}) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return false;
	}

	const typeParameter = getTypeParameterResolution(node, typeState);
	if (typeParameter) {
		return isPromisedTypeAnnotation(typeParameter.type, context, scope, {
			visitedTypeReferenceNames,
			typeState: typeParameter.typeState,
		});
	}

	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return isPromisedTypeAnnotation(node.typeAnnotation, context, scope, {visitedTypeReferenceNames, typeState});
	}

	if (node?.type === 'TSFunctionType') {
		if (isCallableTypeAnnotation(node.returnType, context, scope, {typeState})) {
			return false;
		}

		return isPromisedTypeAnnotation(node.returnType, context, scope, {visitedTypeReferenceNames, typeState});
	}

	if (node?.type === 'TSIntersectionType') {
		const callableTypes = node.types.filter(type => isCallableTypeAnnotation(type, context, scope, {typeState}));
		if (callableTypes.length > 0) {
			return callableTypes.every(type => isPromisedTypeAnnotation(type, context, scope, {visitedTypeReferenceNames, typeState}));
		}

		return node.types.some(type => isPromisedTypeAnnotation(type, context, scope, {visitedTypeReferenceNames, typeState}));
	}

	if (node?.type === 'TSTypeLiteral') {
		const callSignatures = node.members.filter(member => member.type === 'TSCallSignatureDeclaration');
		return callSignatures.length > 0
			&& callSignatures.every(member => isPromisedTypeAnnotation(member.returnType, context, scope, {visitedTypeReferenceNames, typeState}));
	}

	if (node?.type === 'TSUnionType') {
		const types = node.types.filter(type => !nullishTypeAnnotationTypes.has(type.type));
		return types.length > 0 && types.every(type => isPromisedTypeAnnotation(type, context, scope, {visitedTypeReferenceNames, typeState}));
	}

	return node?.type === 'TSTypeReference'
		&& isPromisedTypeReference(node, context, scope, {visitedTypeReferenceNames, typeState});
}

function isCallableTypeAnnotation(node, context, scope, {visitedTypeReferenceNodes = new Set(), typeState = getTypeState()} = {}) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return false;
	}

	const typeParameter = getTypeParameterResolution(node, typeState);
	if (typeParameter) {
		return isCallableTypeAnnotation(typeParameter.type, context, scope, {visitedTypeReferenceNodes, typeState: typeParameter.typeState});
	}

	if (isFunctionTypeAnnotation(node, context, scope)) {
		return true;
	}

	if (node?.type === 'TSTypeAnnotation' || node?.type === 'TSParenthesizedType') {
		return isCallableTypeAnnotation(node.typeAnnotation, context, scope, {visitedTypeReferenceNodes, typeState});
	}

	if (node?.type === 'TSUnionType') {
		const types = node.types.filter(type => !nullishTypeAnnotationTypes.has(type.type));
		return types.length > 0 && types.every(type => isCallableTypeAnnotation(type, context, scope, {visitedTypeReferenceNodes, typeState}));
	}

	if (node?.type === 'TSIntersectionType') {
		return node.types.some(type => isCallableTypeAnnotation(type, context, scope, {visitedTypeReferenceNodes, typeState}));
	}

	if (node?.type !== 'TSTypeReference') {
		return false;
	}

	if (node.typeName.type === 'TSQualifiedName') {
		const {parserServices} = context.sourceCode;
		if (!parserServices?.program) {
			return false;
		}

		try {
			return parserServices.getTypeAtLocation(node).getCallSignatures().length > 0;
		} catch {
			return false;
		}
	}

	const name = getTypeReferenceName(node.typeName);
	if (!name || visitedTypeReferenceNodes.has(node)) {
		return false;
	}

	const definitions = getTypeDefinitions(name, scope);
	if (definitions.length === 0) {
		return false;
	}

	const nextVisitedTypeReferenceNodes = new Set(visitedTypeReferenceNodes);
	nextVisitedTypeReferenceNodes.add(node);
	return definitions.some(definition => {
		const definitionScope = context.sourceCode.getScope(definition.node);
		const definitionTypeState = {
			...typeState,
			typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(node), typeState),
		};
		if (definition.node.type === 'TSInterfaceDeclaration') {
			return getInterfaceCallSignatureBooleanStates(definition.node, context, definitionScope, {
				typeState: definitionTypeState,
				getReturnTypeBooleanState: () => unknown,
				visitedInterfaceNames: new Set([name]),
			}).length > 0;
		}

		return definition.node.type === 'TSTypeAliasDeclaration'
			&& isCallableTypeAnnotation(definition.node.typeAnnotation, context, definitionScope, {
				visitedTypeReferenceNodes: nextVisitedTypeReferenceNodes,
				typeState: definitionTypeState,
			});
	});
}

function isBooleanTypeAnnotatedValue(node, context) {
	const {typeAnnotation} = node;
	if (!typeAnnotation) {
		return false;
	}

	const scope = context.sourceCode.getScope(node);
	if (hasMissingRequiredTypeArguments(typeAnnotation, scope)) {
		return false;
	}

	return isBooleanTypeAnnotation(typeAnnotation, context, scope)
		|| isBooleanFunctionLikeTypeAnnotation(typeAnnotation, context, scope)
		|| (
			!isFunctionTypeAnnotation(typeAnnotation, context, scope)
			&& getDirectTypeAnnotationBooleanState(typeAnnotation, context, scope, {allowNullish: false}) === boolean
		);
}

const getTypeState = typeState => ({
	visitedTypeReferenceNodes: new Set(),
	visitedTypeParameterNames: new Set(),
	functionTypesAreBoolean: true,
	allowNullish: true,
	typeParameterTypes: new Map(),
	...typeState,
});

function getTypeParameterResolution(node, typeState) {
	let currentNode = node;
	let currentTypeState = typeState;
	for (;;) {
		const name = getTypeReferenceName(currentNode?.typeName);
		if (!name || currentTypeState.visitedTypeParameterNames.has(name)) {
			return;
		}

		const typeParameterType = currentTypeState.typeParameterTypes.get(name);
		if (!typeParameterType) {
			return;
		}

		const visitedTypeParameterNames = new Set(currentTypeState.visitedTypeParameterNames);
		visitedTypeParameterNames.add(name);
		const nextTypeState = {
			...currentTypeState,
			visitedTypeParameterNames,
		};
		const nextName = getTypeReferenceName(typeParameterType?.typeName);
		if (
			!nextName
			|| nextTypeState.visitedTypeParameterNames.has(nextName)
			|| !nextTypeState.typeParameterTypes.get(nextName)
		) {
			return {
				type: typeParameterType,
				typeState: hasTypeParameterReference(typeParameterType, name)
					? nextTypeState
					: {...nextTypeState, visitedTypeParameterNames: new Set()},
			};
		}

		currentNode = typeParameterType;
		currentTypeState = nextTypeState;
	}
}

function hasTypeParameterReference(node, name) {
	const nodes = [node];
	const visitedNodes = new Set();
	while (nodes.length > 0) {
		const currentNode = nodes.pop();
		if (currentNode && typeof currentNode === 'object' && !visitedNodes.has(currentNode)) {
			visitedNodes.add(currentNode);
			if (currentNode.type === 'TSTypeReference' && getTypeReferenceName(currentNode.typeName) === name) {
				return true;
			}

			for (const [key, value] of Object.entries(currentNode)) {
				if (key !== 'parent') {
					if (Array.isArray(value)) {
						nodes.push(...value);
					} else {
						nodes.push(value);
					}
				}
			}
		}
	}

	return false;
}

function resolveTypeParameterType(node, typeState, resolvedTypeParameterTypes = new Set(), resolvedTypeParameterNames = new Set(), visitedNodes = new Set()) {
	const createResolveTask = (node, state) => ({kind: 'resolve', node, ...state});
	const initialState = {
		typeState, resolvedTypeParameterTypes, resolvedTypeParameterNames, visitedNodes,
	};
	const stack = [createResolveTask(node, initialState)];
	const results = [];
	const addTasks = tasks => {
		stack.push(...tasks);
	};

	const processTask = task => {
		switch (task.kind) {
			case 'combineAnnotation': {
				const typeAnnotation = results.pop();
				if (typeAnnotation === task.node.typeAnnotation) {
					results.push(task.node);
				} else {
					results.push({
						...task.node,
						typeAnnotation,
					});
				}

				return;
			}

			case 'combineTypes': {
				const types = results.splice(results.length - task.types.length);
				if (types.some((type, index) => type !== task.types[index])) {
					results.push({...task.node, types});
				} else {
					results.push(task.node);
				}

				return;
			}

			case 'combineTypeArguments': {
				const resolvedTypeArguments = results.splice(results.length - task.typeArguments.length);
				if (resolvedTypeArguments.some((type, index) => type !== task.typeArguments[index])) {
					results.push({
						...task.node,
						[task.typeArgumentsProperty]: {
							...task.node[task.typeArgumentsProperty],
							params: resolvedTypeArguments,
						},
					});
				} else {
					results.push(task.node);
				}

				return;
			}

			default: {
				const {
					node,
					typeState,
					resolvedTypeParameterTypes,
					resolvedTypeParameterNames,
					visitedNodes,
				} = task;

				if (!node || typeof node !== 'object' || visitedNodes.has(node)) {
					results.push(node);
					return;
				}

				const nextVisitedNodes = new Set(visitedNodes);
				nextVisitedNodes.add(node);
				const typeParameter = getTypeParameterResolution(node, typeState);
				if (typeParameter) {
					const name = getTypeReferenceName(node.typeName);
					if (resolvedTypeParameterTypes.has(typeParameter.type) || resolvedTypeParameterNames.has(name)) {
						results.push(node);
						return;
					}

					const nextResolvedTypeParameterTypes = new Set(resolvedTypeParameterTypes);
					nextResolvedTypeParameterTypes.add(typeParameter.type);
					const nextResolvedTypeParameterNames = new Set(resolvedTypeParameterNames);
					nextResolvedTypeParameterNames.add(name);
					addTasks([createResolveTask(typeParameter.type, {
						typeState: typeParameter.typeState,
						resolvedTypeParameterTypes: nextResolvedTypeParameterTypes,
						resolvedTypeParameterNames: nextResolvedTypeParameterNames,
						visitedNodes: nextVisitedNodes,
					})]);
					return;
				}

				if (
					node.type === 'TSTypeAnnotation'
					|| node.type === 'TSParenthesizedType'
				) {
					addTasks([
						{kind: 'combineAnnotation', node},
						createResolveTask(node.typeAnnotation, {
							typeState,
							resolvedTypeParameterTypes,
							resolvedTypeParameterNames,
							visitedNodes: nextVisitedNodes,
						}),
					]);
					return;
				}

				if (
					node.type === 'TSUnionType'
					|| node.type === 'TSIntersectionType'
				) {
					addTasks([
						{kind: 'combineTypes', node, types: node.types},
						...node.types.toReversed().map(type => createResolveTask(type, {
							typeState,
							resolvedTypeParameterTypes,
							resolvedTypeParameterNames,
							visitedNodes: nextVisitedNodes,
						})),
					]);
					return;
				}

				const typeArguments = node.type === 'TSTypeReference' ? getTypeArguments(node) : undefined;
				if (!typeArguments) {
					results.push(node);
					return;
				}

				const typeArgumentsProperty = node.typeArguments ? 'typeArguments' : 'typeParameters';
				addTasks([
					{
						kind: 'combineTypeArguments', node, typeArguments, typeArgumentsProperty,
					},
					...typeArguments.toReversed().map(type => createResolveTask(type, {
						typeState,
						resolvedTypeParameterTypes,
						resolvedTypeParameterNames,
						visitedNodes: nextVisitedNodes,
					})),
				]);
			}
		}
	};

	while (stack.length > 0) {
		processTask(stack.pop());
	}

	return results[0];
}

function getTypeParameterTypes(definitionNode, typeArguments, typeState) {
	const typeParameterTypes = new Map(typeState.typeParameterTypes);
	for (const [index, parameter] of (definitionNode.typeParameters?.params ?? []).entries()) {
		const typeArgument = typeArguments?.[index];
		if (typeArgument) {
			typeParameterTypes.set(parameter.name.name, resolveTypeParameterType(typeArgument, typeState));
		} else if (parameter.default) {
			typeParameterTypes.set(parameter.name.name, resolveTypeParameterType(parameter.default, {
				...typeState,
				typeParameterTypes,
			}));
		} else {
			typeParameterTypes.delete(parameter.name.name);
		}
	}

	return typeParameterTypes;
}

const hasUnresolvedTypeParameters = typeState =>
	typeState.typeParameterTypes.entries().some(([name, type]) => hasTypeParameterReference(type, name));

const hasTypeParameterReferenceInType = (node, typeState) =>
	typeState.typeParameterTypes.keys().some(name => hasTypeParameterReference(node, name));

function hasUnresolvedTypeParameterReference(node, typeState, scope, checkNode = true) {
	const nodes = [{node, checkNode}];
	const visitedNodes = new Set();
	while (nodes.length > 0) {
		const current = nodes.pop();
		if (!current.node || typeof current.node !== 'object' || visitedNodes.has(current.node)) {
			continue;
		}

		visitedNodes.add(current.node);
		const name = current.node.type === 'TSTypeReference' ? getTypeReferenceName(current.node.typeName) : undefined;
		if (
			current.checkNode
			&& name
			&& !getTypeParameterResolution(current.node, typeState)
			&& getTypeDefinitions(name, scope)
				.some(definition => definition.node.type === 'TSTypeParameter')
		) {
			return true;
		}

		const childNodes = Object.entries(current.node)
			.filter(([key]) => key !== 'parent')
			.flatMap(([, value]) => Array.isArray(value) ? value : [value]);
		nodes.push(...childNodes.map(child => ({node: child, checkNode: true})));
	}

	return false;
}

function canUseTypeInformationFallback(node, typeState, scope, definitions) {
	return !hasTypeParameterReferenceInType(node, typeState)
		&& !hasUnresolvedTypeParameters(typeState)
		&& !hasUnresolvedTypeParameterReference(node, typeState, scope)
		&& (
			definitions.some(definition =>
				['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'].includes(definition.node.type),
			)
			|| node?.typeName?.type === 'TSQualifiedName'
		);
}

function getTypeMembersBooleanState(members, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	const callSignatures = members.filter(member => member.type === 'TSCallSignatureDeclaration');

	if (callSignatures.length > 0) {
		return normalizedTypeState.functionTypesAreBoolean
			? combineBooleanStates(callSignatures.map(member => getTypeAnnotationBooleanState(member.returnType, context, scope, {...normalizedTypeState, functionTypesAreBoolean: false})))
			: nonBoolean;
	}

	return members.length > 0 ? nonBoolean : unknown;
}

function getInterfaceCallSignatureBooleanStates(interfaceNode, context, scope, {typeState, getReturnTypeBooleanState, visitedInterfaceNames = new Set()}) {
	const normalizedTypeState = getTypeState(typeState);
	let callSignatureStates = [];
	if (normalizedTypeState.functionTypesAreBoolean) {
		callSignatureStates = interfaceNode.body.body
			.filter(member => member.type === 'TSCallSignatureDeclaration')
			.map(member => getReturnTypeBooleanState(member.returnType, context, scope, normalizedTypeState));
	} else if (interfaceNode.body.body.some(member => member.type === 'TSCallSignatureDeclaration')) {
		callSignatureStates = [nonBoolean];
	}

	for (const heritage of interfaceNode.extends ?? []) {
		const name = getTypeReferenceName(heritage.expression);
		if (!name || visitedInterfaceNames.has(name)) {
			continue;
		}

		const nextVisitedInterfaceNames = new Set(visitedInterfaceNames);
		nextVisitedInterfaceNames.add(name);
		for (const definition of getTypeDefinitions(name, scope)) {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...normalizedTypeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(heritage), normalizedTypeState),
			};
			if (definition.node.type === 'TSInterfaceDeclaration') {
				callSignatureStates.push(...getInterfaceCallSignatureBooleanStates(definition.node, context, definitionScope, {
					typeState: definitionTypeState,
					getReturnTypeBooleanState,
					visitedInterfaceNames: nextVisitedInterfaceNames,
				}));
			} else if (definition.node.type === 'TSTypeAliasDeclaration') {
				callSignatureStates.push(...getCallSignatureReturnTypes(definition.node.typeAnnotation, context, definitionScope, {typeState: definitionTypeState}).map(returnType =>
					getReturnTypeBooleanState(returnType, context, definitionScope, definitionTypeState),
				));
			}
		}
	}

	return callSignatureStates;
}

function getTypeReferenceBooleanState(node, context, scope, typeState) {
	if (isGlobalPromiseTypeReference(node, scope)) {
		return nonBoolean;
	}

	const normalizedTypeState = getTypeState(typeState);
	const {visitedTypeReferenceNodes} = normalizedTypeState;
	const name = getTypeReferenceName(node.typeName ?? node.expression);
	if (!name || visitedTypeReferenceNodes.has(node)) {
		return unknown;
	}

	visitedTypeReferenceNodes.add(node);

	const definitions = getTypeDefinitions(name, scope);
	let result = unknown;

	const interfaceDefinitions = getInterfaceDefinitions(name, scope);
	if (interfaceDefinitions.length > 0) {
		const callSignatureStates = interfaceDefinitions.flatMap(definition => {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...normalizedTypeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(node), normalizedTypeState),
			};
			return getInterfaceCallSignatureBooleanStates(definition.node, context, definitionScope, {
				typeState: definitionTypeState,
				getReturnTypeBooleanState: (returnType, context, scope, typeState) =>
					getTypeAnnotationBooleanState(returnType, context, scope, {...typeState, functionTypesAreBoolean: false}),
				visitedInterfaceNames: new Set([name]),
			});
		});
		result = callSignatureStates.length > 0
			? combineBooleanStates(callSignatureStates)
			: getTypeMembersBooleanState(
				interfaceDefinitions.flatMap(definition => definition.node.body.body),
				context,
				context.sourceCode.getScope(interfaceDefinitions[0].node),
				normalizedTypeState,
			);
	} else {
		const [definition] = definitions;
		if (definition?.node.type === 'TSTypeAliasDeclaration') {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...normalizedTypeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, getTypeArguments(node), normalizedTypeState),
			};
			result = getDirectTypeAnnotationBooleanState(definition.node.typeAnnotation, context, definitionScope, definitionTypeState);
		}
	}

	visitedTypeReferenceNodes.delete(node);
	if (
		result === unknown
		&& context.sourceCode.parserServices?.program
		&& canUseTypeInformationFallback(node, normalizedTypeState, scope, definitions)
	) {
		result = getTypeInformationBooleanState(node, context, normalizedTypeState.functionTypesAreBoolean, normalizedTypeState.allowNullish);
	}

	return result;
}

function getUnionTypeAnnotationBooleanState(node, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	const states = node.types.map(type => getTypeAnnotationBooleanState(type, context, scope, normalizedTypeState));
	const nonNullishStates = states.filter((_, index) => !nullishTypeAnnotationTypes.has(node.types[index].type));
	const nonNullishState = combineBooleanStates(nonNullishStates);

	if (!normalizedTypeState.allowNullish && nonNullishState === nonBoolean) {
		return nonBoolean;
	}

	return combineBooleanStates(normalizedTypeState.allowNullish ? nonNullishStates : states);
}

function getSimpleTypeAnnotationBooleanState(node) {
	if (!node) {
		return unknown;
	}

	if (
		nullishTypeAnnotationTypes.has(node.type)
		|| unknownTypeAnnotationTypes.has(node.type)
	) {
		return unknown;
	}

	if (node.type === 'TSBooleanKeyword') {
		return boolean;
	}

	if (node.type === 'TSLiteralType') {
		return typeof node.literal.value === 'boolean' ? boolean : nonBoolean;
	}

	if (node.type === 'TSTypePredicate') {
		return node.asserts ? nonBoolean : boolean;
	}

	if (node.type === 'TypeAnnotation') {
		return node.typeAnnotation?.type === 'BooleanTypeAnnotation' ? boolean : nonBoolean;
	}

	return nonBoolean;
}

function getTypeAnnotationBooleanState(node, context, scope, typeState) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return unknown;
	}

	const normalizedTypeState = getTypeState(typeState);

	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return getTypeAnnotationBooleanState(node.typeAnnotation, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSTypeReference') {
		const typeParameter = getTypeParameterResolution(node, normalizedTypeState);
		if (typeParameter) {
			return getTypeAnnotationBooleanState(typeParameter.type, context, scope, typeParameter.typeState);
		}
	}

	if (node?.type === 'TSFunctionType') {
		return normalizedTypeState.functionTypesAreBoolean
			? getTypeAnnotationBooleanState(node.returnType, context, scope, {...normalizedTypeState, functionTypesAreBoolean: false})
			: nonBoolean;
	}

	if (node?.type === 'TSUnionType') {
		return getUnionTypeAnnotationBooleanState(node, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSIntersectionType') {
		const callableTypes = node.types.filter(type => isCallableTypeAnnotation(type, context, scope, {typeState: normalizedTypeState}));
		if (callableTypes.length === 0 || !normalizedTypeState.functionTypesAreBoolean) {
			return nonBoolean;
		}

		return combineBooleanStates(callableTypes.map(type => getTypeAnnotationBooleanState(type, context, scope, normalizedTypeState)));
	}

	if (node?.type === 'TSTypeReference') {
		return getTypeReferenceBooleanState(node, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSTypeLiteral') {
		return getTypeMembersBooleanState(node.members, context, scope, normalizedTypeState);
	}

	return getSimpleTypeAnnotationBooleanState(node);
}

function getPromisedTypeReferenceBooleanState(node, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	const name = getTypeReferenceName(node.typeName ?? node.expression);
	const typeParameter = getTypeParameterResolution(node, normalizedTypeState);
	if (typeParameter) {
		return getPromisedTypeAnnotationBooleanState(typeParameter.type, context, scope, typeParameter.typeState);
	}

	const typeArguments = getTypeArguments(node);
	if (isGlobalPromiseTypeReference(node, scope)) {
		return getTypeAnnotationBooleanState(typeArguments[0], context, scope, {
			...normalizedTypeState,
			functionTypesAreBoolean: false,
		});
	}

	const {visitedTypeReferenceNodes} = normalizedTypeState;
	if (!name || visitedTypeReferenceNodes.has(node)) {
		return unknown;
	}

	visitedTypeReferenceNodes.add(node);
	const definitions = getTypeDefinitions(name, scope);
	let result = unknown;
	const interfaceDefinitions = getInterfaceDefinitions(name, scope);
	if (interfaceDefinitions.length > 0) {
		const callSignatureStates = interfaceDefinitions.flatMap(definition => {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...normalizedTypeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, typeArguments, normalizedTypeState),
			};
			return getInterfaceCallSignatureBooleanStates(definition.node, context, definitionScope, {
				typeState: definitionTypeState,
				getReturnTypeBooleanState: (returnType, context, scope, typeState) =>
					getPromisedTypeAnnotationBooleanState(returnType, context, scope, typeState),
				visitedInterfaceNames: new Set([name]),
			});
		});
		result = callSignatureStates.length > 0
			? combineBooleanStates(callSignatureStates)
			: getPromisedTypeMembersBooleanState(
				interfaceDefinitions.flatMap(definition => definition.node.body.body),
				context,
				context.sourceCode.getScope(interfaceDefinitions[0].node),
				normalizedTypeState,
			);
	} else {
		const [definition] = definitions;
		if (definition?.node.type === 'TSTypeAliasDeclaration') {
			const definitionScope = context.sourceCode.getScope(definition.node);
			const definitionTypeState = {
				...normalizedTypeState,
				typeParameterTypes: getTypeParameterTypes(definition.node, typeArguments, normalizedTypeState),
			};
			result = getPromisedTypeAnnotationBooleanState(definition.node.typeAnnotation, context, definitionScope, definitionTypeState);
		}
	}

	visitedTypeReferenceNodes.delete(node);
	if (
		result === unknown
		&& context.sourceCode.parserServices?.program
		&& canUseTypeInformationFallback(node, normalizedTypeState, scope, definitions)
	) {
		result = interfaceDefinitions.length > 0
			? getAsyncFunctionTypeInformationBooleanState(node, context, normalizedTypeState.allowNullish)
			: getPromisedTypeInformationBooleanState(node, context, normalizedTypeState.allowNullish);
	}

	return result;
}

function getPromisedTypeAnnotationBooleanState(node, context, scope, typeState) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return unknown;
	}

	const normalizedTypeState = getTypeState(typeState);

	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return getPromisedTypeAnnotationBooleanState(node.typeAnnotation, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSFunctionType') {
		if (!normalizedTypeState.functionTypesAreBoolean) {
			return nonBoolean;
		}

		if (isCallableTypeAnnotation(node.returnType, context, scope, {typeState: normalizedTypeState})) {
			return unknown;
		}

		return getPromisedTypeAnnotationBooleanState(node.returnType, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSUnionType') {
		return combineBooleanStates(
			node.types
				.filter(type => !nullishTypeAnnotationTypes.has(type.type) || !normalizedTypeState.allowNullish)
				.map(type => getPromisedTypeAnnotationBooleanState(type, context, scope, normalizedTypeState)),
		);
	}

	if (node?.type === 'TSIntersectionType') {
		const callableTypes = node.types.filter(type => isCallableTypeAnnotation(type, context, scope, {typeState: normalizedTypeState}));
		if (callableTypes.length > 0) {
			if (!normalizedTypeState.functionTypesAreBoolean) {
				return nonBoolean;
			}

			return combineBooleanStates(callableTypes.map(type => getPromisedTypeAnnotationBooleanState(type, context, scope, normalizedTypeState)));
		}

		const promisedTypes = node.types.filter(type => isPromisedTypeAnnotation(type, context, scope, {typeState: normalizedTypeState}));
		return promisedTypes.length > 0
			? combineBooleanStates(promisedTypes.map(type => getPromisedTypeAnnotationBooleanState(type, context, scope, normalizedTypeState)))
			: unknown;
	}

	if (node?.type === 'TSTypeLiteral') {
		return getPromisedTypeMembersBooleanState(node.members, context, scope, normalizedTypeState);
	}

	return node?.type === 'TSTypeReference'
		? getPromisedTypeReferenceBooleanState(node, context, scope, normalizedTypeState)
		: unknown;
}

function getPromisedTypeMembersBooleanState(members, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	const callSignatures = members.filter(member => member.type === 'TSCallSignatureDeclaration');

	if (callSignatures.length > 0) {
		return normalizedTypeState.functionTypesAreBoolean
			? combineBooleanStates(callSignatures.map(member => getPromisedTypeAnnotationBooleanState(member.returnType, context, scope, normalizedTypeState)))
			: nonBoolean;
	}

	return members.length > 0 ? nonBoolean : unknown;
}

function isGlobalTypeReferenceName(name, scope) {
	return getTypeDefinitions(name, scope).length === 0;
}

function isGlobalPromiseTypeReference(node, scope) {
	if (node?.type !== 'TSTypeReference') {
		return false;
	}

	const typeName = getTypeReferenceName(node.typeName);
	return promiseValueTypeNames.has(typeName)
		&& getTypeArguments(node)?.length === 1
		&& isGlobalTypeReferenceName(typeName, scope);
}

function isGlobalPromiseTypeAnnotation(node, scope) {
	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return isGlobalPromiseTypeAnnotation(node.typeAnnotation, scope);
	}

	if (node?.type === 'TSUnionType') {
		const types = node.types.filter(type => !nullishTypeAnnotationTypes.has(type.type));
		return types.length > 0 && types.every(type => isGlobalPromiseTypeAnnotation(type, scope));
	}

	return isGlobalPromiseTypeReference(node, scope);
}

function getAsyncFunctionTypeInformationBooleanState(node, context, allowNullish = true) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	while (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		node = node.typeAnnotation;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const typeScriptNode = parserServices.esTreeNodeToTSNodeMap.get(node);
		const signature = isFunction(node) ? checker.getSignatureFromDeclaration(typeScriptNode) : undefined;
		const signatures = signature ? [signature] : parserServices.getTypeAtLocation(node).getCallSignatures();

		return combineBooleanStates(signatures.map(signature => {
			const returnType = checker.getReturnTypeOfSignature(signature);
			const nonNullableReturnType = checker.getNonNullableType(returnType);
			if (!allowNullish && nonNullableReturnType !== returnType) {
				return unknown;
			}

			const promisedType = checker.getPromisedTypeOfPromise(nonNullableReturnType);
			if (!promisedType) {
				return unknown;
			}

			const nonNullableType = checker.getNonNullableType(promisedType);
			if (!allowNullish && nonNullableType !== promisedType) {
				return unknown;
			}

			return getTypeBooleanState(nonNullableType, checker, new Set(), false);
		}));
	} catch {
		return unknown;
	}
}

function getFunctionBooleanState(node, context, visitedVariables = new Set(), isAsync = node.async) {
	if (node.generator) {
		return nonBoolean;
	}

	const scope = context.sourceCode.getScope(node);
	const hasUnresolvedReturnType = isAsync
		&& hasUnresolvedTypeParameterReference(node.returnType, getTypeState(), scope, false);
	// Only actual async function implementations and their overload signatures get `Promise<T>` unwrapped in function-body analysis. Promise-valued variables are not predicates; type-only callable signatures are handled separately by direct annotation analysis.
	const stateFromPromisedReturnType = isAsync && !hasUnresolvedReturnType
		? getPromisedReturnTypeBooleanState(node.returnType, context, scope)
		: unknown;
	if (stateFromPromisedReturnType !== unknown) {
		return stateFromPromisedReturnType;
	}

	const stateFromReturnType = isAsync ? unknown : getTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false});
	if (stateFromReturnType !== unknown) {
		return stateFromReturnType;
	}

	const stateFromTypeInformation = isAsync
		? (hasUnresolvedReturnType
			? unknown
			: getAsyncFunctionTypeInformationBooleanState(node, context, false))
		: getTypeInformationBooleanState(node, context);
	if (stateFromTypeInformation !== unknown) {
		return stateFromTypeInformation;
	}

	if (
		isAsync
		&& !hasUnresolvedReturnType
		&& getAsyncFunctionTypeInformationBooleanState(node, context) === nonBoolean
	) {
		return nonBoolean;
	}

	if (isAsync && (hasUnresolvedReturnType || hasNullableType(node, context))) {
		return unknown;
	}

	if (!node.body) {
		return unknown;
	}

	if (node.body.type === 'BlockStatement') {
		if (node.body.body.length === 0) {
			return nonBoolean;
		}

		if (
			node.body.body.length === 1
			&& node.body.body[0].type === 'ReturnStatement'
		) {
			return node.body.body[0].argument
				? getExpressionBooleanState(node.body.body[0].argument, context, visitedVariables, false)
				: nonBoolean;
		}
	}

	return node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement'
		? getExpressionBooleanState(node.body, context, visitedVariables, false)
		: unknown;
}

function getKnownIdentifierBooleanState(node, context, visitedVariables, functionValuesAreBoolean) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable ? getVariableBooleanState(variable, context, visitedVariables, functionValuesAreBoolean) : unknown;
}

function getStaticExpressionBooleanState(node, scope) {
	if (node.type === 'Identifier') {
		return unknown;
	}

	const staticValue = getStaticValue(node, scope)?.value;

	return staticValue === undefined
		? unknown
		: (typeof staticValue === 'boolean' ? boolean : nonBoolean);
}

function getSimpleExpressionBooleanState(node) {
	if (nonBooleanExpressionTypes.has(node.type)) {
		return nonBoolean;
	}

	if (node.type === 'Literal') {
		return node.value === null ? unknown : nonBoolean;
	}

	if (node.type === 'UnaryExpression') {
		return ['!', 'delete'].includes(node.operator) ? boolean : nonBoolean;
	}

	if (node.type === 'BinaryExpression') {
		return booleanBinaryOperators.has(node.operator) ? boolean : nonBoolean;
	}

	return unknown;
}

function getWrappedExpression(node) {
	if (expressionWrapperTypes.has(node.type)) {
		return node.argument ?? node.expression;
	}

	if (typeScriptExpressionWrapperTypes.has(node.type)) {
		return node.expression;
	}
}

function getDerivedExpressionBooleanState(node, context, visitedVariables, functionValuesAreBoolean) {
	if (node.type === 'Identifier') {
		return getKnownIdentifierBooleanState(node, context, visitedVariables, functionValuesAreBoolean);
	}

	const wrappedExpression = getWrappedExpression(node);
	if (wrappedExpression) {
		return getExpressionBooleanState(wrappedExpression, context, visitedVariables, functionValuesAreBoolean);
	}

	if (node.type === 'AssignmentExpression') {
		return node.operator === '=' ? getExpressionBooleanState(node.right, context, visitedVariables, functionValuesAreBoolean) : unknown;
	}

	if (node.type === 'SequenceExpression') {
		return getExpressionBooleanState(node.expressions.at(-1), context, visitedVariables, functionValuesAreBoolean);
	}

	if (node.type === 'ConditionalExpression') {
		return combineBooleanStates([
			getExpressionBooleanState(node.consequent, context, visitedVariables, functionValuesAreBoolean),
			getExpressionBooleanState(node.alternate, context, visitedVariables, functionValuesAreBoolean),
		]);
	}

	return unknown;
}

function getExpressionBooleanState(node, context, visitedVariables = new Set(), functionValuesAreBoolean = true) {
	if (!node) {
		return unknown;
	}

	if (isFunction(node)) {
		return functionValuesAreBoolean
			? getFunctionBooleanState(node, context, visitedVariables)
			: nonBoolean;
	}

	const scope = context.sourceCode.getScope(node);
	const typeState = getTypeState();
	const stateFromTypeInformation = hasUnresolvedTypeParameterReference(node.typeAnnotation, typeState, scope, false)
		? unknown
		: getTypeInformationBooleanState(node, context, functionValuesAreBoolean);
	if (stateFromTypeInformation !== unknown) {
		return stateFromTypeInformation;
	}

	const stateFromTypeAnnotation = getDirectTypeAnnotationBooleanState(node.typeAnnotation, context, scope, {functionTypesAreBoolean: functionValuesAreBoolean});
	if (stateFromTypeAnnotation !== unknown) {
		return stateFromTypeAnnotation;
	}

	if (isBooleanExpression(node, context, visitedVariables)) {
		return boolean;
	}

	const stateFromStaticValue = getStaticExpressionBooleanState(node, scope);
	if (stateFromStaticValue !== unknown) {
		return stateFromStaticValue;
	}

	const stateFromSimpleExpression = getSimpleExpressionBooleanState(node);
	if (stateFromSimpleExpression !== unknown) {
		return stateFromSimpleExpression;
	}

	return getDerivedExpressionBooleanState(node, context, visitedVariables, functionValuesAreBoolean);
}

const isBooleanVariable = (variable, context) => {
	const {sourceCode} = context;

	const functionDefinitions = getFunctionDefinitions(variable);
	if (functionDefinitions) {
		const hasAsyncImplementation = hasAsyncFunctionImplementation(variable.defs);
		return functionDefinitions.every(definition => isBooleanFunctionDefinition(definition, context, hasAsyncImplementation));
	}

	const definition = getSupportedVariableDefinition(variable);
	if (!definition) {
		return false;
	}

	const {name} = definition;

	if (name.typeAnnotation) {
		return isBooleanTypeAnnotatedValue(name, context);
	}

	if (definition.type === 'Parameter') {
		// Some parsers (such as Svelte's `{#each}` bindings) create `Parameter` definitions whose owner is not a function and has no `params` list.
		if (!isFunction(definition.node)) {
			return false;
		}

		const parameter = findParameter(definition.node.params, name);

		return parameter?.type === 'AssignmentPattern'
			&& isBooleanExpression(parameter.right, context);
	}

	if (isBooleanExpression(name, context)) {
		return true;
	}

	if (definition.type === 'Variable') {
		return isBooleanValue(definition.node.init, context);
	}

	return definition.type === 'FunctionName' && isBooleanFunctionDefinition(definition, context);
};

function getParameterBooleanState(definition, context, visitedVariables, functionValuesAreBoolean) {
	if (!isFunction(definition.node)) {
		return unknown;
	}

	const parameter = findParameter(definition.node.params, definition.name);

	return parameter?.type === 'AssignmentPattern'
		? getExpressionBooleanState(parameter.right, context, visitedVariables, functionValuesAreBoolean)
		: unknown;
}

function getDirectTypeAnnotationBooleanState(node, context, scope, typeState) {
	if (hasMissingRequiredTypeArguments(node, scope)) {
		return unknown;
	}

	if (isGlobalPromiseTypeAnnotation(node, scope)) {
		return nonBoolean;
	}

	const normalizedTypeState = getTypeState(typeState);
	const stateFromAsyncFunctionType = getAsyncFunctionTypeAnnotationBooleanState(node, context, scope, normalizedTypeState);
	if (stateFromAsyncFunctionType !== unknown) {
		return stateFromAsyncFunctionType;
	}

	if (
		isCallableTypeAnnotation(node, context, scope)
		&& isPromisedTypeAnnotation(node, context, scope)
	) {
		return unknown;
	}

	return getTypeAnnotationBooleanState(node, context, scope, normalizedTypeState);
}

function getDefinitionBooleanState(definition, context, visitedVariables, functionValuesAreBoolean) {
	const scope = context.sourceCode.getScope(definition.name);
	const stateFromTypeAnnotation = getDirectTypeAnnotationBooleanState(definition.name.typeAnnotation, context, scope, {functionTypesAreBoolean: functionValuesAreBoolean});
	if (stateFromTypeAnnotation !== unknown) {
		return stateFromTypeAnnotation;
	}

	if (definition.type === 'Parameter') {
		return getParameterBooleanState(definition, context, visitedVariables, functionValuesAreBoolean);
	}

	if (definition.type === 'Variable') {
		if (definition.node.parent.parent?.type === 'ForInStatement') {
			return nonBoolean;
		}

		return getExpressionBooleanState(definition.node.init, context, visitedVariables, functionValuesAreBoolean);
	}

	if (definition.type === 'FunctionName') {
		return functionValuesAreBoolean
			? getFunctionBooleanState(definition.node, context, visitedVariables)
			: nonBoolean;
	}

	return unknown;
}

function getReferenceWriteBooleanState(reference, context, visitedVariables, functionValuesAreBoolean) {
	const {parent} = reference.identifier;
	if (
		parent.type === 'ForInStatement'
		|| parent.type === 'UpdateExpression'
		|| (
			parent.type === 'AssignmentExpression'
			&& parent.operator !== '='
			&& !logicalAssignmentOperators.has(parent.operator)
		)
	) {
		return nonBoolean;
	}

	if (parent.type !== 'AssignmentExpression') {
		return unknown;
	}

	return getExpressionBooleanState(reference.writeExpr, context, visitedVariables, functionValuesAreBoolean);
}

function getVariableBooleanState(variable, context, visitedVariables = new Set(), functionValuesAreBoolean = true) {
	if (!variable || visitedVariables.has(variable)) {
		return unknown;
	}

	visitedVariables.add(variable);

	const functionDefinitions = getFunctionDefinitions(variable);
	const definition = getSupportedVariableDefinition(variable);
	if (
		!functionDefinitions
		&& !definition
	) {
		visitedVariables.delete(variable);
		return unknown;
	}

	let result;
	if (functionDefinitions && !functionValuesAreBoolean) {
		result = nonBoolean;
	} else if (functionDefinitions) {
		if (hasGeneratorFunctionImplementation(variable.defs)) {
			result = nonBoolean;
		} else {
			const hasAsyncImplementation = hasAsyncFunctionImplementation(variable.defs);
			result = combineBooleanStates(functionDefinitions.map(definition =>
				getFunctionBooleanState(definition.node, context, visitedVariables, hasAsyncImplementation || definition.node.async),
			));
		}
	} else {
		result = getDefinitionBooleanState(definition, context, visitedVariables, functionValuesAreBoolean);
	}

	const writeStates = variable.references
		.filter(reference => reference.writeExpr || ['ForInStatement', 'UpdateExpression'].includes(reference.identifier.parent.type))
		.map(reference => getReferenceWriteBooleanState(reference, context, visitedVariables, functionValuesAreBoolean));
	if (writeStates.length > 0) {
		result = combineVariableBooleanStates([
			result,
			...writeStates,
		]);
	}

	if (
		result === unknown
		&& functionValuesAreBoolean
		&& isBooleanVariable(variable, context)
	) {
		result = boolean;
	}

	visitedVariables.delete(variable);
	return result;
}

function getBooleanPropertyName(node, sourceCode) {
	const propertyNameNode = node.type === 'TSParameterProperty' ? getParameterPropertyNameNode(node) : node.key;

	if (
		!node.computed
		&& [
			'Identifier',
			'PrivateIdentifier',
		].includes(propertyNameNode?.type)
	) {
		return propertyNameNode.name;
	}

	if (
		propertyNameNode?.type === 'Literal'
		&& typeof propertyNameNode.value === 'string'
	) {
		return propertyNameNode.value;
	}

	const name = getPropertyName(node, sourceCode.getScope(node));

	return typeof name === 'string' ? name : undefined;
}

function getTypeScriptNameParts(node) {
	if (node?.type === 'Identifier') {
		return [node.name];
	}

	if (node?.type === 'Literal' && typeof node.value === 'string') {
		return [node.value];
	}

	return node?.type === 'TSQualifiedName'
		? [...getTypeScriptNameParts(node.left), ...getTypeScriptNameParts(node.right)]
		: [];
}

function getTypeScriptIdentityPrefix(node) {
	if (node.global) {
		return 'global';
	}

	if (node.id.type === 'Literal') {
		return 'module';
	}

	return 'namespace';
}

function getTypeScriptModuleIdentity(node) {
	const namespaceNames = [];
	const namespaceIdentityParts = [];
	let isAmbient = false;
	let isExternalModule = false;
	let isGlobal = false;
	for (let current = node; current; current = current.parent) {
		if (current.type !== 'TSModuleDeclaration') {
			continue;
		}

		isAmbient ||= current.declare || current.global || current.id.type === 'Literal';
		isExternalModule ||= current.id.type === 'Literal';
		isGlobal ||= current.global;

		const names = getTypeScriptNameParts(current.id);
		const identityPrefix = getTypeScriptIdentityPrefix(current);

		namespaceNames.unshift(...names);
		namespaceIdentityParts.unshift(...names.map(name => `${identityPrefix}:${name}`));
	}

	return {
		namespaceNames,
		namespaceIdentityParts,
		isAmbient,
		isExternalModule,
		isGlobal,
	};
}

function getMemberReportIdentity(node, sourceCode) {
	if (typeScriptMemberTypes.has(node.type)) {
		const interfaceNode = node.parent?.parent;
		const interfaceName = interfaceNode?.type === 'TSInterfaceDeclaration' ? interfaceNode.id.name : undefined;
		if (interfaceName) {
			const {
				namespaceNames,
				namespaceIdentityParts,
				isAmbient,
				isExternalModule,
				isGlobal,
			} = getTypeScriptModuleIdentity(interfaceNode.parent);

			const isExportedInterface = interfaceNode.parent?.type === 'ExportNamedDeclaration';
			if (namespaceNames.length > 0 && !isAmbient && !isExportedInterface) {
				return {owner: interfaceNode.parent, name: interfaceName};
			}

			const ownerName = namespaceNames[0] ?? interfaceName;
			const namespaceIdentity = namespaceIdentityParts.join('/');
			let owner = isExternalModule || isGlobal
				? namespaceIdentity
				: resolveVariableName(ownerName, sourceCode.getScope(node));
			if (!owner && namespaceNames.length > 0) {
				owner = namespaceIdentity;
			}

			if (owner) {
				return {owner, name: [...namespaceNames, interfaceName].join('.')};
			}
		}
	}

	return {owner: node.parent};
}

const getMemberReportKey = node => [
	node.static ? 'static' : 'instance',
	node.key?.type === 'PrivateIdentifier' ? 'private' : 'public',
].join(':');

function getPromisedReturnTypeBooleanState(node, context, scope) {
	if (hasUnresolvedTypeParameterReference(node, getTypeState(), scope, false)) {
		return unknown;
	}

	const state = getPromisedTypeAnnotationBooleanState(node, context, scope, {functionTypesAreBoolean: false, allowNullish: false});
	if (state !== unknown) {
		return state;
	}

	return getPromisedTypeAnnotationBooleanState(node, context, scope, {functionTypesAreBoolean: false}) === nonBoolean
		? nonBoolean
		: unknown;
}

function getParameterPropertyNameNode(node) {
	const parameter = unwrapParameter(node.parameter);
	return parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
}

function getShorthandVariable(node, sourceCode) {
	if (
		node.type !== 'Property'
		|| !node.shorthand
		|| node.parent.type !== 'ObjectExpression'
		|| node.key.type !== 'Identifier'
	) {
		return;
	}

	return findVariable(sourceCode.getScope(node), node.key);
}

function isBooleanProperty(node, context) {
	const {sourceCode} = context;

	if (node.type === 'TSParameterProperty') {
		return isBooleanVariable(findVariable(sourceCode.getScope(node), getParameterPropertyNameNode(node)), context);
	}

	if (node.type === 'Property') {
		if (
			node.parent.type !== 'ObjectExpression'
			|| node.kind === 'set'
		) {
			return false;
		}

		return isBooleanValue(node.value, context);
	}

	if (methodDefinitionTypes.has(node.type)) {
		return !['constructor', 'set'].includes(node.kind) && isBooleanFunctionValue(node.value, context);
	}

	if (propertyDefinitionTypes.has(node.type)) {
		return isBooleanTypeAnnotatedValue(node, context)
			|| isBooleanValue(node.value, context);
	}

	if (node.type === 'TSPropertySignature') {
		return isBooleanTypeAnnotatedValue(node, context);
	}

	if (node.type === 'TSMethodSignature') {
		if (isSetter(node)) {
			return false;
		}

		const scope = sourceCode.getScope(node);

		return getDirectTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false, allowNullish: false}) === boolean
			|| getPromisedReturnTypeBooleanState(node.returnType, context, scope) === boolean;
	}

	return false;
}

function getExplicitPropertyBooleanState(node, context) {
	const {sourceCode} = context;

	if (node.type === 'TSParameterProperty') {
		return getVariableBooleanState(findVariable(sourceCode.getScope(node), getParameterPropertyNameNode(node)), context);
	}

	if (node.type === 'Property') {
		if (
			node.parent.type !== 'ObjectExpression'
			|| node.kind === 'set'
		) {
			return unknown;
		}

		if (node.shorthand) {
			return getVariableBooleanState(getShorthandVariable(node, sourceCode), context);
		}

		return getExpressionBooleanState(node.value, context);
	}

	if (methodDefinitionTypes.has(node.type)) {
		return ['constructor', 'set'].includes(node.kind) ? unknown : getFunctionBooleanState(node.value, context);
	}

	if (propertyDefinitionTypes.has(node.type)) {
		const scope = sourceCode.getScope(node);
		const stateFromTypeAnnotation = getDirectTypeAnnotationBooleanState(node.typeAnnotation, context, scope);
		if (stateFromTypeAnnotation !== unknown) {
			return stateFromTypeAnnotation;
		}

		return getExpressionBooleanState(node.value, context);
	}

	if (node.type === 'TSPropertySignature') {
		return getDirectTypeAnnotationBooleanState(node.typeAnnotation, context, sourceCode.getScope(node), {allowNullish: false});
	}

	if (node.type === 'TSMethodSignature') {
		if (isSetter(node)) {
			return unknown;
		}

		const scope = sourceCode.getScope(node);
		const hasUnresolvedReturnType = hasUnresolvedTypeParameterReference(node.returnType, getTypeState(), scope, false);
		const stateFromPromisedReturnType = getPromisedReturnTypeBooleanState(node.returnType, context, scope);

		return stateFromPromisedReturnType === unknown
			&& !hasUnresolvedReturnType
			&& !isPromisedTypeAnnotation(node.returnType, context, scope)
			? getTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false, allowNullish: false})
			: stateFromPromisedReturnType;
	}

	return unknown;
}

function getPropertyBooleanState(node, context) {
	const state = getExplicitPropertyBooleanState(node, context);
	return state === unknown && isBooleanProperty(node, context) ? boolean : state;
}

function getSuggestions(variable, prefixes, context, nameForPrefixCheck) {
	const [definition] = variable.defs;
	if (
		!shouldSuggestRename(variable)
		|| variable.references.some(reference => reference.vueUsedInTemplate)
		|| (definition && isParameterPropertyDefinition(definition))
	) {
		return;
	}

	const scopes = [
		...variable.references.map(reference => reference.from),
		variable.scope,
	];
	const usedReplacements = new Set();
	const suggestions = [];

	for (const prefix of prefixes) {
		const replacement = getAvailableVariableName(getReactHookReplacementName({name: variable.name, nameForPrefixCheck}, prefix), scopes);

		if (!replacement || usedReplacements.has(replacement)) {
			continue;
		}

		usedReplacements.add(replacement);
		suggestions.push({
			messageId: MESSAGE_ID_SUGGESTION,
			data: {replacement},
			fix: fixer => renameVariable(variable, replacement, context, fixer),
		});
	}

	return suggestions.length > 0 ? suggestions : undefined;
}

function isAutofixableVariable(variable, context) {
	const [definition] = variable.defs;
	if (
		variable.scope.type === 'global'
		|| definition?.type !== 'Variable'
		|| isInDeclareContext(definition.node)
		|| isFunction(definition.node.init)
		|| getVariableIdentifiers(variable).some(identifier =>
			isExportedIdentifier(identifier)
			|| isExportDefaultIdentifier(identifier)
			|| isExportSpecifierLocal(identifier),
		)
	) {
		return false;
	}

	const {sourceCode} = context;
	const scope = sourceCode.getScope(definition.name);

	return !isBooleanFunctionLikeTypeAnnotation(definition.name.typeAnnotation, context, scope)
		&& !isBooleanFunctionReference(definition.node.init, context)
		&& !isBooleanAsyncFunctionReference(definition.node.init, context);
}

function isInDeclareContext(node) {
	for (let currentNode = node; currentNode; currentNode = currentNode.parent) {
		if (currentNode.declare) {
			return true;
		}
	}

	return false;
}

function getAutofix({
	variable,
	prefixes,
	context,
	suggestions,
	nameForPrefixCheck,
}) {
	if (
		!suggestions
		|| !isAutofixableVariable(variable, context)
	) {
		return;
	}

	const [prefix] = prefixes;
	const replacement = getReactHookReplacementName({name: variable.name, nameForPrefixCheck}, prefix);
	const suggestion = suggestions.find(suggestion => suggestion.data.replacement === replacement);

	return suggestion?.fix;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		checkVariables,
		checkArguments,
		checkFunctions,
		checkMethods,
		checkFields,
		prefixes,
		ignore,
		wrappers,
	} = prepareOptions(context.options[0]);

	if (prefixes.length === 0) {
		return;
	}

	const checkVariable = variable => {
		if (
			isIgnoredName(variable.name, ignore)
			|| isDestructuredVariable(variable)
		) {
			return;
		}

		const option = getVariableOption(variable);
		const mode = variableModes[option];
		if (!option || mode === NEVER) {
			return;
		}

		const nameForPrefixCheck = getNameForPrefixCheck(variable, context);
		const booleanPrefix = getBooleanPrefix(nameForPrefixCheck, prefixes);
		if (booleanPrefix) {
			const booleanState = getVariableBooleanState(variable, context);
			const booleanWrapperState = wrappers.size === 0 || booleanState === boolean
				? unknown
				: getBooleanWrapperVariableState({
					variable,
					definition: getSupportedVariableDefinition(variable),
					context,
					wrappers,
				});
			const effectiveBooleanState = booleanWrapperState === unknown ? booleanState : booleanWrapperState;
			if (
				effectiveBooleanState === nonBoolean
				&& !isBooleanReactReferenceVariable(variable, context)
				&& !isBooleanVueReferenceVariable(variable, context)
			) {
				const [definition] = variable.defs;

				context.report({
					node: definition.name,
					messageId: MESSAGE_ID_NON_BOOLEAN_PREFIX,
					data: {
						name: nameForPrefixCheck,
						prefix: booleanPrefix,
					},
				});
			}

			return;
		}

		// For names without a boolean prefix, only structurally-boolean values are flagged.
		// `isBooleanVariable` is a cheaper check than the full `getVariableBooleanState` analysis,
		// so bail out on the common non-boolean case before running the expensive check.
		if (mode !== ALWAYS) {
			return;
		}

		if (
			!isBooleanVariable(variable, context)
			|| getVariableBooleanState(variable, context) === nonBoolean
		) {
			return;
		}

		const [definition] = variable.defs;
		const suggest = getSuggestions(variable, prefixes, context, nameForPrefixCheck);

		context.report({
			node: definition.name,
			messageId: MESSAGE_ID,
			data: {
				name: nameForPrefixCheck,
				prefixes: formatPrefixes(prefixes),
			},
			fix: getAutofix({
				variable,
				prefixes,
				context,
				suggestions: suggest,
				nameForPrefixCheck,
			}),
			suggest,
		});
	};

	const variableModes = {checkVariables, checkArguments, checkFunctions};
	const memberReports = new Map();
	const getMemberReport = (node, name) => {
		const {owner, name: qualifiedName} = getMemberReportIdentity(node, context.sourceCode);
		let reports = memberReports.get(owner);
		if (!reports) {
			reports = new Map();
			memberReports.set(owner, reports);
		}

		const key = `${qualifiedName ?? ''}:${name}:${getMemberReportKey(node)}`;
		let memberReport = reports.get(key);
		if (!memberReport) {
			memberReport = {
				reported: false,
				states: [],
			};
			reports.set(key, memberReport);
		}

		return memberReport;
	};

	context.on('Program', node => {
		for (const scope of getScopes(context.sourceCode.getScope(node))) {
			for (const variable of scope.variables) {
				checkVariable(variable);
			}
		}
	});

	const checkProperty = (node, mode) => {
		if (mode === NEVER) {
			return;
		}

		const name = getBooleanPropertyName(node, context.sourceCode);

		if (
			!name
			|| isIgnoredName(name, ignore)
		) {
			return;
		}

		if (isSetter(node)) {
			return;
		}

		const booleanPrefix = getBooleanPrefix(name, prefixes);
		const reportNode = node.key ?? getParameterPropertyNameNode(node);
		const shouldDeduplicate = methodDefinitionTypes.has(node.type)
			|| typeScriptMemberTypes.has(node.type)
			|| (node.type === 'Property' && (node.method || node.kind === 'get'));
		const report = problem => {
			if (!shouldDeduplicate) {
				context.report(problem);
				return;
			}

			const memberReport = getMemberReport(node, name);
			if (memberReport.reported) {
				return;
			}

			memberReport.reported = true;
			context.report(problem);
		};

		if (booleanPrefix) {
			const booleanState = getPropertyBooleanState(node, context);

			if (booleanState === nonBoolean) {
				report({
					node: reportNode,
					messageId: MESSAGE_ID_NON_BOOLEAN_PREFIX,
					data: {
						name,
						prefix: booleanPrefix,
					},
				});
			}

			return;
		}

		if (mode !== ALWAYS) {
			return;
		}

		if (shouldDeduplicate) {
			const memberReport = getMemberReport(node, name);
			memberReport.states.push({
				node,
				state: getPropertyBooleanState(node, context),
			});
			memberReport.problem ??= {
				node: reportNode,
				messageId: MESSAGE_ID,
				data: {
					name,
					prefixes: formatPrefixes(prefixes),
				},
			};
			return;
		}

		// For names without a boolean prefix, only structurally-boolean values are flagged.
		// `isBooleanProperty` is a cheaper check than the full `getPropertyBooleanState` analysis,
		// so bail out on the common non-boolean case before running the expensive check.
		if (
			!isBooleanProperty(node, context)
		) {
			return;
		}

		if (getExplicitPropertyBooleanState(node, context) === nonBoolean) {
			return;
		}

		report({
			node: reportNode,
			messageId: MESSAGE_ID,
			data: {
				name,
				prefixes: formatPrefixes(prefixes),
			},
		});
	};

	context.onExit('Program', () => {
		for (const reports of memberReports.values()) {
			for (const {problem, states} of reports.values()) {
				const hasOverloadSignature = states.some(({node}) =>
					methodDefinitionTypes.has(node.type)
					&& !node.value?.body,
				);
				const statesToCombine = states
					.filter(({node}) =>
						!hasOverloadSignature
						|| !methodDefinitionTypes.has(node.type)
						|| !node.value?.body,
					)
					.map(({state}) => state);

				if (problem && combineBooleanStates(statesToCombine) === boolean) {
					context.report(problem);
				}
			}
		}
	});

	const checkClassBody = node => {
		for (const element of node.body) {
			const mode = methodDefinitionTypes.has(element.type) ? checkMethods : checkFields;
			checkProperty(element, mode);
		}
	};

	if (checkMethods !== NEVER || checkFields !== NEVER) {
		context.on('Property', node => {
			const mode = node.method || ['get', 'set'].includes(node.kind) ? checkMethods : checkFields;
			checkProperty(node, mode);
		});
		context.on('ClassBody', checkClassBody);
	}

	if (checkFields !== NEVER) {
		context.on('TSParameterProperty', node => checkProperty(node, checkFields));
		context.on('TSPropertySignature', node => checkProperty(node, checkFields));
	}

	if (checkMethods !== NEVER) {
		context.on('TSMethodSignature', node => checkProperty(node, checkMethods));
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent naming for boolean names.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				description: 'Rule options.',
				additionalProperties: false,
				patternProperties: {
					'^checkProperties$': {},
				},
				properties: {
					checkVariables: {
						enum: [ALWAYS, PROHIBIT, NEVER],
						description: 'How to check variable names.',
					},
					checkArguments: {
						enum: [ALWAYS, PROHIBIT, NEVER],
						description: 'How to check parameter names.',
					},
					checkFunctions: {
						enum: [ALWAYS, PROHIBIT, NEVER],
						description: 'How to check function names.',
					},
					checkMethods: {
						enum: [ALWAYS, PROHIBIT, NEVER],
						description: 'How to check object and class methods, getters, and TypeScript method signatures. Setter names are ignored because setters do not return values.',
					},
					checkFields: {
						enum: [ALWAYS, PROHIBIT, NEVER],
						description: 'How to check object properties, class fields, TypeScript property signatures, and constructor parameter properties.',
					},
					prefixes: {
						type: 'object',
						description: 'Boolean name prefixes to allow or disallow.',
						additionalProperties: {
							type: 'boolean',
							description: 'Whether the prefix is allowed.',
						},
						propertyNames: {
							description: 'Prefix name.',
							pattern: '^[a-z][a-zA-Z0-9]*$',
						},
					},
					wrappers: {
						type: 'object',
						description: 'Wrapper type names and their boolean-like value members.',
						additionalProperties: {
							type: 'string',
							description: 'The property or method that provides the wrapped value.',
							minLength: 1,
						},
					},
					ignore: {
						type: 'array',
						uniqueItems: true,
						description: 'Patterns to ignore.',
					},
				},
			},
		],
		defaultOptions: [{
			checkVariables: ALWAYS,
			checkArguments: ALWAYS,
			checkFunctions: ALWAYS,
			checkMethods: NEVER,
			checkFields: NEVER,
			ignore: [],
			wrappers: {},
		}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
