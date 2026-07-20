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

const prepareOptions = ({
	checkProperties = false,
	prefixes = {},
	ignore = [],
	booleanWrappers = {},
} = {}) => ({
	checkProperties,
	prefixes: getEnabledPrefixes({prefixes}),
	ignore: ignore.map(pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u')),
	booleanWrappers: new Map(Object.entries(booleanWrappers)),
});

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

const hasWriteAfterInitialization = variable =>
	variable.references.some(reference => !reference.init && reference.isWrite());

const isBooleanFunctionDefinition = (definition, context) =>
	definition.type === 'FunctionName'
	&& isFunction(definition.node)
	&& isBooleanFunction(definition.node, context);

const isBooleanValue = (node, context) => isFunction(node)
	? isBooleanFunction(node, context)
	: isBooleanFunctionReference(node, context) || isBooleanExpression(node, context);

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
		|| (definition.type === 'Parameter' && definition.node.parent?.kind === 'set')
	) {
		return;
	}

	return definition;
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
			|| isFunctionTypeAnnotation(definition.name.typeAnnotation, context, context.sourceCode.getScope(definition.name))
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

function getTypeInformationBooleanState(node, context, functionTypesAreBoolean = true) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		return getTypeBooleanState(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
			new Set(),
			functionTypesAreBoolean,
		);
	} catch {
		return unknown;
	}
}

function getTypeReferenceName(typeName) {
	if (typeName?.type === 'Identifier') {
		return typeName.name;
	}
}

const getTypeArguments = node => node?.typeArguments?.params ?? node?.typeParameters?.params;

const getTypeState = typeState => ({
	visitedTypeReferenceNames: new Set(),
	functionTypesAreBoolean: true,
	...typeState,
});

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

function getTypeReferenceBooleanState(node, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);
	const {visitedTypeReferenceNames} = normalizedTypeState;
	const name = getTypeReferenceName(node.typeName);
	if (!name || visitedTypeReferenceNames.has(name)) {
		return unknown;
	}

	visitedTypeReferenceNames.add(name);

	const [definition] = resolveVariableName(name, scope)?.defs ?? [];
	let result = unknown;

	if (definition?.type === 'Type') {
		const definitionScope = context.sourceCode.getScope(definition.node);

		if (definition.node.type === 'TSTypeAliasDeclaration') {
			result = getDirectTypeAnnotationBooleanState(definition.node.typeAnnotation, context, definitionScope, normalizedTypeState);
		} else if (definition.node.type === 'TSInterfaceDeclaration') {
			result = getTypeMembersBooleanState(definition.node.body.body, context, definitionScope, normalizedTypeState);
		}
	}

	visitedTypeReferenceNames.delete(name);
	return result;
}

function getUnionTypeAnnotationBooleanState(node, context, scope, typeState) {
	return combineBooleanStates(
		node.types
			.filter(type => !nullishTypeAnnotationTypes.has(type.type))
			.map(type => getTypeAnnotationBooleanState(type, context, scope, typeState)),
	);
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
	const normalizedTypeState = getTypeState(typeState);

	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return getTypeAnnotationBooleanState(node.typeAnnotation, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSFunctionType') {
		return normalizedTypeState.functionTypesAreBoolean
			? getTypeAnnotationBooleanState(node.returnType, context, scope, {...normalizedTypeState, functionTypesAreBoolean: false})
			: nonBoolean;
	}

	if (node?.type === 'TSUnionType') {
		return getUnionTypeAnnotationBooleanState(node, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSTypeReference') {
		return getTypeReferenceBooleanState(node, context, scope, normalizedTypeState);
	}

	if (node?.type === 'TSTypeLiteral') {
		return getTypeMembersBooleanState(node.members, context, scope, normalizedTypeState);
	}

	return getSimpleTypeAnnotationBooleanState(node);
}

function getPromisedTypeAnnotationBooleanState(node, context, scope, typeState) {
	const normalizedTypeState = getTypeState(typeState);

	if (
		node?.type === 'TSTypeAnnotation'
		|| node?.type === 'TSParenthesizedType'
	) {
		return getPromisedTypeAnnotationBooleanState(node.typeAnnotation, context, scope, normalizedTypeState);
	}

	if (node?.type !== 'TSTypeReference') {
		return unknown;
	}

	const name = getTypeReferenceName(node.typeName);
	const typeArguments = getTypeArguments(node);
	if (
		name === 'Promise'
		&& typeArguments?.length === 1
		&& isGlobalTypeReferenceName(name, scope)
	) {
		return getTypeAnnotationBooleanState(typeArguments[0], context, scope, normalizedTypeState);
	}

	return unknown;
}

function isGlobalTypeReferenceName(name, scope) {
	return (resolveVariableName(name, scope)?.defs ?? []).every(definition => definition.type !== 'Type');
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

function getAsyncFunctionTypeInformationBooleanState(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const typeScriptNode = parserServices.esTreeNodeToTSNodeMap.get(node);
		const signature = checker.getSignatureFromDeclaration(typeScriptNode);
		if (signature) {
			return getPromisedTypeBooleanState(checker.getReturnTypeOfSignature(signature), checker);
		}

		return combineBooleanStates(
			parserServices.getTypeAtLocation(node)
				.getCallSignatures()
				.map(signature => getPromisedTypeBooleanState(checker.getReturnTypeOfSignature(signature), checker)),
		);
	} catch {
		return unknown;
	}
}

function getFunctionBooleanState(node, context, visitedVariables = new Set(), isAsync = node.async) {
	if (node.generator) {
		return nonBoolean;
	}

	const scope = context.sourceCode.getScope(node);
	// Only actual async function implementations and their overload signatures get `Promise<T>` unwrapped as a predicate return. Promise-valued variables and unrelated type-only callable signatures stay outside this boundary.
	const stateFromPromisedReturnType = isAsync
		? getPromisedTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false})
		: unknown;
	if (stateFromPromisedReturnType !== unknown) {
		return stateFromPromisedReturnType;
	}

	const stateFromReturnType = isAsync ? unknown : getTypeAnnotationBooleanState(node.returnType, context, scope, {functionTypesAreBoolean: false});
	if (stateFromReturnType !== unknown) {
		return stateFromReturnType;
	}

	const stateFromTypeInformation = isAsync
		? getAsyncFunctionTypeInformationBooleanState(node, context)
		: getTypeInformationBooleanState(node, context);
	if (stateFromTypeInformation !== unknown) {
		return stateFromTypeInformation;
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

	const stateFromTypeInformation = getTypeInformationBooleanState(node, context, functionValuesAreBoolean);
	if (stateFromTypeInformation !== unknown) {
		return stateFromTypeInformation;
	}

	const scope = context.sourceCode.getScope(node);
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
		return functionDefinitions.every(definition => isBooleanFunctionDefinition(definition, context));
	}

	const definition = getSupportedVariableDefinition(variable);
	if (!definition) {
		return false;
	}

	const {name} = definition;

	if (name.typeAnnotation) {
		const scope = sourceCode.getScope(name);
		return isBooleanTypeAnnotation(name.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(name.typeAnnotation, context, scope);
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
	if (isGlobalPromiseTypeAnnotation(node, scope)) {
		return nonBoolean;
	}

	return getTypeAnnotationBooleanState(node, context, scope, typeState);
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
	if (
		!node.computed
		&& [
			'Identifier',
			'PrivateIdentifier',
		].includes(node.key?.type)
	) {
		return node.key.name;
	}

	if (
		node.key?.type === 'Literal'
		&& typeof node.key.value === 'string'
	) {
		return node.key.value;
	}

	const name = getPropertyName(node, sourceCode.getScope(node));

	return typeof name === 'string' ? name : undefined;
}

function isBooleanProperty(node, context) {
	const {sourceCode} = context;

	if (node.type === 'Property') {
		if (
			node.parent.type !== 'ObjectExpression'
			|| node.shorthand
			|| node.kind === 'set'
		) {
			return false;
		}

		return isBooleanValue(node.value, context);
	}

	if (
		node.type === 'MethodDefinition'
		|| node.type === 'TSAbstractMethodDefinition'
	) {
		return !['constructor', 'set'].includes(node.kind) && isBooleanFunction(node.value, context);
	}

	if (propertyDefinitionTypes.has(node.type)) {
		const scope = sourceCode.getScope(node);

		return isBooleanTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanValue(node.value, context);
	}

	if (node.type === 'TSPropertySignature') {
		const scope = sourceCode.getScope(node);

		return isBooleanTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope);
	}

	if (node.type === 'TSMethodSignature') {
		return isBooleanTypeAnnotation(node.returnType, context, sourceCode.getScope(node));
	}

	return false;
}

function getExplicitPropertyBooleanState(node, context) {
	const {sourceCode} = context;

	if (node.type === 'Property') {
		if (
			node.parent.type !== 'ObjectExpression'
			|| node.shorthand
			|| node.kind === 'set'
		) {
			return unknown;
		}

		return getExpressionBooleanState(node.value, context);
	}

	if (
		node.type === 'MethodDefinition'
		|| node.type === 'TSAbstractMethodDefinition'
	) {
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
		return getDirectTypeAnnotationBooleanState(node.typeAnnotation, context, sourceCode.getScope(node));
	}

	if (node.type === 'TSMethodSignature') {
		return getTypeAnnotationBooleanState(node.returnType, context, sourceCode.getScope(node), {functionTypesAreBoolean: false});
	}

	return unknown;
}

function getPropertyBooleanState(node, context) {
	const state = getExplicitPropertyBooleanState(node, context);
	return state === unknown && isBooleanProperty(node, context) ? boolean : state;
}

function getSuggestions(variable, prefixes, context, nameForPrefixCheck) {
	if (
		!shouldSuggestRename(variable)
		|| variable.references.some(reference => reference.vueUsedInTemplate)
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

	return !isBooleanFunctionTypeAnnotation(definition.name.typeAnnotation, context, scope)
		&& !isBooleanFunctionReference(definition.node.init, context);
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
	const {checkProperties, prefixes, ignore, booleanWrappers} = prepareOptions(context.options[0]);

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

		const nameForPrefixCheck = getNameForPrefixCheck(variable, context);
		const booleanPrefix = getBooleanPrefix(nameForPrefixCheck, prefixes);
		if (booleanPrefix) {
			const booleanState = getVariableBooleanState(variable, context);
			const booleanWrapperState = booleanWrappers.size === 0 || booleanState === boolean
				? unknown
				: getBooleanWrapperVariableState({
					variable,
					definition: getSupportedVariableDefinition(variable),
					context,
					booleanWrappers,
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

	context.on('Program', node => {
		for (const scope of getScopes(context.sourceCode.getScope(node))) {
			for (const variable of scope.variables) {
				checkVariable(variable);
			}
		}
	});

	if (!checkProperties) {
		return;
	}

	const checkProperty = node => {
		const name = getBooleanPropertyName(node, context.sourceCode);

		if (
			!name
			|| isIgnoredName(name, ignore)
		) {
			return;
		}

		const booleanPrefix = getBooleanPrefix(name, prefixes);
		if (booleanPrefix) {
			if (getPropertyBooleanState(node, context) === nonBoolean) {
				context.report({
					node: node.key,
					messageId: MESSAGE_ID_NON_BOOLEAN_PREFIX,
					data: {
						name,
						prefix: booleanPrefix,
					},
				});
			}

			return;
		}

		// For names without a boolean prefix, only structurally-boolean values are flagged.
		// `isBooleanProperty` is a cheaper check than the full `getPropertyBooleanState` analysis,
		// so bail out on the common non-boolean case before running the expensive check.
		if (
			!isBooleanProperty(node, context)
			|| getPropertyBooleanState(node, context) === nonBoolean
		) {
			return;
		}

		context.report({
			node: node.key,
			messageId: MESSAGE_ID,
			data: {
				name,
				prefixes: formatPrefixes(prefixes),
			},
		});
	};

	context.on('Property', checkProperty);
	context.on('ClassBody', node => {
		for (const element of node.body) {
			checkProperty(element);
		}
	});
	context.on('TSPropertySignature', checkProperty);
	context.on('TSMethodSignature', checkProperty);
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
				properties: {
					checkProperties: {
						type: 'boolean',
						description: 'Whether to check object, class, and TypeScript property and method names.',
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
					booleanWrappers: {
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
		defaultOptions: [{ignore: [], booleanWrappers: {}}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
