import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import getStaticValueIfNoSideEffects from './get-static-value.js';
import {getFunctionReturnExpression} from './function-body.js';
import {withTypeInformation} from './types.js';
import {getJSDocumentTypeAnnotation, getJSDocumentReturnType, hasNativeTypeAssertion} from './jsdoc-type.js';
import {getJSDocumentBooleanState} from './get-jsdoc-boolean-state.js';
import {
	createTypeCheckers,
	getDefinitionInitializer,
	getJSDocumentCallableReturnType,
	hasJSDocumentTypeReference,
} from './type-helpers.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';
import {isIndexedCollection} from './is-array.js';
import isString from './is-string.js';

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

const booleanTypeStrings = new Set(['boolean', 'true', 'false']);
const booleanGlobalFunctions = new Set(['isFinite', 'isNaN']);
const nullishTypeAnnotationTypes = new Set([
	'TSNullKeyword',
	'TSUndefinedKeyword',
]);

const booleanStaticMethods = new Map([
	['Array', new Set(['isArray'])],
	['ArrayBuffer', new Set(['isView'])],
	['Atomics', new Set(['isLockFree'])],
	['Error', new Set(['isError'])],
	['Number', new Set(['isFinite', 'isInteger', 'isNaN', 'isSafeInteger'])],
	['Object', new Set(['hasOwn', 'is', 'isExtensible', 'isFrozen', 'isSealed'])],
	['Reflect', new Set(['deleteProperty', 'has'])],
	['URL', new Set(['canParse'])],
]);

const booleanMethodsByExpressionKind = new Map([
	['array', new Set(['every', 'includes', 'some'])],
	['map', new Set(['has'])],
	['regexp', new Set(['test'])],
	['set', new Set(['has', 'isDisjointFrom', 'isSubsetOf', 'isSupersetOf'])],
	['string', new Set(['endsWith', 'includes', 'isWellFormed', 'startsWith'])],
	['weakSet', new Set(['has'])],
]);

const booleanPropertiesByExpressionKind = new Map([
	['regexp', new Set(['dotAll', 'global', 'hasIndices', 'ignoreCase', 'multiline', 'sticky', 'unicode', 'unicodeSets'])],
]);

const createNamedTypeChecker = names => createTypeCheckers({
	targetTypeNames: new Set(names),
	checkClassHeritage: false,
}).isTarget;

const expressionKindCheckers = new Map([
	['array', isIndexedCollection],
	['map', createNamedTypeChecker(['Map', 'ReadonlyMap', 'WeakMap'])],
	['regexp', createNamedTypeChecker(['RegExp'])],
	['set', createNamedTypeChecker(['Set', 'ReadonlySet'])],
	['string', isString],
	['weakSet', createNamedTypeChecker(['WeakSet'])],
]);

// The static value of these is never a primitive boolean, so they skip the costly side effect checks and evaluation.
const nonBooleanStaticValueTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'NewExpression',
	'ObjectExpression',
	'TaggedTemplateExpression',
	'TemplateLiteral',
]);

const isBooleanStaticValue = (node, context) => {
	if (node.type === 'Literal') {
		return typeof node.value === 'boolean';
	}

	return !nonBooleanStaticValueTypes.has(node.type)
		&& typeof getStaticValueIfNoSideEffects(node, context)?.value === 'boolean'
		&& !hasJSDocumentTypeReference(node, context);
};

function isBooleanTypeScriptType(type, checker) {
	if (type.isUnion?.()) {
		return type.types.every(type => isBooleanTypeScriptType(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isBooleanTypeScriptType(constraint, checker);
	}

	return booleanTypeStrings.has(checker.typeToString(type));
}

const {isKnownNonTarget: isKnownNonBoolean} = createTypeCheckers({
	targetTypeNames: new Set(['boolean']),
	nonTargetTypeNames: new Set(['Array', 'ReadonlyArray', 'Promise', 'PromiseLike']),
	isTargetTypeAnnotation: node => node?.type === 'TSBooleanKeyword'
		|| (node?.type === 'TSLiteralType' && typeof node.literal.value === 'boolean'),
	isTargetType: isBooleanTypeScriptType,
});

function isBooleanTypeInformation(node, context) {
	return (withTypeInformation(node, context, ({type, checker}) => isBooleanTypeScriptType(type, checker)) ?? false)
		&& !isKnownNonBoolean(node, context);
}

function isBooleanCallSignatureMembers(members, context, scope, visitedTypeReferences) {
	const callSignatures = members.filter(member => member.type === 'TSCallSignatureDeclaration');

	return callSignatures.length > 0
		&& callSignatures.every(member => isBooleanTypeAnnotation(member.returnType, context, scope, visitedTypeReferences));
}

const hasCallSignatureMembers = members =>
	members.some(member => member.type === 'TSCallSignatureDeclaration');

function isTypeReference({
	node,
	context,
	scope,
	visitedTypeReferences,
	predicate,
}) {
	if (node.typeName?.type !== 'Identifier') {
		return false;
	}

	// Use the parser's binding to respect function signature scopes and generic parameters.
	const variable = context.sourceCode.getScope(node).references.find(reference => reference.identifier === node.typeName)?.resolved;
	if (!variable || visitedTypeReferences.has(variable)) {
		return false;
	}

	visitedTypeReferences.add(variable);
	const [definition] = variable.defs;
	const definitionScope = definition?.type === 'Type'
		? context.sourceCode.getScope(definition.node)
		: scope;
	const result = definition?.type === 'Type' && predicate(definition.node, definitionScope);

	visitedTypeReferences.delete(variable);
	return result;
}

const isBooleanTypeReference = (node, context, scope, visitedTypeReferences) => isTypeReference(
	{
		node,
		context,
		scope,
		visitedTypeReferences,
		predicate: (definitionNode, definitionScope) => definitionNode.type === 'TSTypeAliasDeclaration'
			&& isBooleanTypeAnnotation(definitionNode.typeAnnotation, context, definitionScope, visitedTypeReferences),
	},
);

const isBooleanFunctionTypeReference = (node, context, scope, visitedTypeReferences) => isTypeReference(
	{
		node,
		context,
		scope,
		visitedTypeReferences,
		predicate: (definitionNode, definitionScope) => (
			definitionNode.type === 'TSTypeAliasDeclaration'
			&& isBooleanFunctionTypeAnnotation(definitionNode.typeAnnotation, context, definitionScope, visitedTypeReferences)
		) || (
			definitionNode.type === 'TSInterfaceDeclaration'
			&& isBooleanCallSignatureMembers(definitionNode.body.body, context, definitionScope, visitedTypeReferences)
		),
	},
);

const isFunctionTypeReference = (node, context, scope, visitedTypeReferences) => isTypeReference(
	{
		node,
		context,
		scope,
		visitedTypeReferences,
		predicate: (definitionNode, definitionScope) => (
			definitionNode.type === 'TSTypeAliasDeclaration'
			&& isFunctionTypeAnnotation(definitionNode.typeAnnotation, context, definitionScope, visitedTypeReferences)
		) || (
			definitionNode.type === 'TSInterfaceDeclaration'
			&& hasCallSignatureMembers(definitionNode.body.body)
		),
	},
);

function isBooleanTypeAnnotation(node, context, scope, visitedTypeReferences = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBooleanTypeAnnotation(node.typeAnnotation, context, scope, visitedTypeReferences);
		}

		case 'TSBooleanKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return typeof node.literal.value === 'boolean';
		}

		case 'TSTypeReference': {
			return isBooleanTypeReference(node, context, scope, visitedTypeReferences);
		}

		case 'TSTypePredicate': {
			return !node.asserts;
		}

		case 'TSUnionType': {
			return node.types.every(type => isBooleanTypeAnnotation(type, context, scope, visitedTypeReferences));
		}

		// Flow annotation from `@babel/eslint-parser`, which the tests do not use.
		/* node:coverage ignore next 3 */
		case 'TypeAnnotation': {
			return node.typeAnnotation?.type === 'BooleanTypeAnnotation';
		}

		default: {
			return false;
		}
	}
}

function isFunctionTypeAnnotation(node, context, scope, visitedTypeReferences = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isFunctionTypeAnnotation(node.typeAnnotation, context, scope, visitedTypeReferences);
		}

		case 'TSFunctionType': {
			return true;
		}

		case 'TSTypeLiteral': {
			return hasCallSignatureMembers(node.members);
		}

		case 'TSTypeReference': {
			return isFunctionTypeReference(node, context, scope, visitedTypeReferences);
		}

		case 'TSUnionType': {
			const types = node.types.filter(type => !nullishTypeAnnotationTypes.has(type.type));

			return types.length > 0
				&& types.every(type => isFunctionTypeAnnotation(type, context, scope, visitedTypeReferences));
		}

		default: {
			return false;
		}
	}
}

function isBooleanFunctionTypeAnnotation(node, context, scope, visitedTypeReferences = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope, visitedTypeReferences);
		}

		case 'TSFunctionType': {
			return isBooleanTypeAnnotation(node.returnType, context, scope, visitedTypeReferences);
		}

		case 'TSTypeLiteral': {
			return isBooleanCallSignatureMembers(node.members, context, scope, visitedTypeReferences);
		}

		case 'TSTypeReference': {
			return isBooleanFunctionTypeReference(node, context, scope, visitedTypeReferences);
		}

		case 'TSUnionType': {
			return node.types.every(type => isBooleanFunctionTypeAnnotation(type, context, scope, visitedTypeReferences));
		}

		default: {
			return false;
		}
	}
}

function isBooleanFunction(node, context, visitedVariables = new Set()) {
	if (node.async || node.generator) {
		return false;
	}

	const annotation = getJSDocumentReturnType(node, context);
	if (annotation) {
		return getJSDocumentBooleanState(annotation) === 'boolean';
	}

	const scope = context.sourceCode.getScope(node);
	if (isBooleanTypeAnnotation(node.returnType, context, scope)) {
		return true;
	}

	if (!node.body) {
		return false;
	}

	return isBooleanExpression(getFunctionReturnExpression(node), context, visitedVariables);
}

const isSimpleConstVariableDefinition = definition => definition.type === 'Variable'
	&& definition.parent.kind === 'const'
	&& definition.node.id === definition.name;

const hasStableFunctionNameDefinitions = variable => (
	variable.scope.type === 'function-expression-name'
	|| (variable.scope.type !== 'global' && variable.scope.isStrict)
) && variable.defs.every(definition => definition.type === 'FunctionName');

function isBooleanFunctionReference(node, context, visitedVariables = new Set()) {
	if (node?.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || visitedVariables.has(variable)) {
		return false;
	}

	visitedVariables.add(variable);

	let isBoolean = false;
	if (
		variable.defs.length > 1
		&& hasStableFunctionNameDefinitions(variable)
	) {
		const overloadDefinitions = variable.defs.filter(definition => definition.node.type === 'TSDeclareFunction');
		const functionDefinitions = overloadDefinitions.length > 0 ? overloadDefinitions : variable.defs;
		isBoolean = variable.references.every(reference => !reference.isWrite())
			&& functionDefinitions.every(definition => isBooleanFunction(definition.node, context, visitedVariables));
	} else if (variable.defs.length === 1) {
		const [definition] = variable.defs;
		const scope = context.sourceCode.getScope(definition.name);
		const annotation = getJSDocumentTypeAnnotation(definition.name, context);
		if (annotation) {
			const initializer = getDefinitionInitializer(definition);
			const value = unwrapTypeScriptExpression(initializer);
			const returnType = getJSDocumentCallableReturnType(annotation.type);
			if (
				!value?.async
				&& !value?.generator
				&& !(definition.type === 'Parameter' && (value?.returnType || hasNativeTypeAssertion(initializer)))
				&& variable.references.every(reference => !reference.isWrite() || reference.init)
			) {
				isBoolean = value?.returnType
					? isBooleanTypeAnnotation(value.returnType, context, context.sourceCode.getScope(value))
					: !annotation.optional
						&& returnType !== undefined
						&& getJSDocumentBooleanState({type: returnType}) === 'boolean';
			}
		} else if (definition.name?.typeAnnotation) {
			isBoolean = isBooleanFunctionTypeAnnotation(definition.name.typeAnnotation, context, scope);
		} else {
			let functionNode;
			if (hasStableFunctionNameDefinitions(variable)) {
				if (variable.references.every(reference => !reference.isWrite())) {
					functionNode = definition.node;
				}
			} else if (
				definition.type === 'Variable'
				&& definition.node.id === definition.name
				&& variable.references.every(reference => !reference.isWrite() || reference.init)
			) {
				let initializer = definition.node.init;
				while (
					initializer?.type === 'TSSatisfiesExpression'
					|| initializer?.type === 'TSNonNullExpression'
				) {
					initializer = initializer.expression;
				}

				if (['ArrowFunctionExpression', 'FunctionExpression'].includes(initializer?.type)) {
					functionNode = initializer;
				}
			}

			isBoolean = functionNode
				? (!functionNode.returnType || isBooleanTypeAnnotation(functionNode.returnType, context, context.sourceCode.getScope(functionNode)))
				&& isBooleanFunction(functionNode, context, visitedVariables)
				: false;
		}
	}

	visitedVariables.delete(variable);
	return isBoolean;
}

function isBooleanVariableValue(variable, context, visitedVariables) {
	if (!variable || visitedVariables.has(variable) || variable.defs.length !== 1) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const scope = context.sourceCode.getScope(definition.name);
	if (definition.name?.typeAnnotation) {
		visitedVariables.delete(variable);
		return !definition.name.optional && isBooleanTypeAnnotation(definition.name.typeAnnotation, context, scope);
	}

	const isBoolean = isSimpleConstVariableDefinition(definition)
		? isBooleanExpression(definition.node.init, context, visitedVariables)
		: false;

	visitedVariables.delete(variable);
	return isBoolean;
}

function isBooleanIdentifier(node, context, visitedVariables) {
	const scope = context.sourceCode.getScope(node);

	return isBooleanVariableValue(findVariable(scope, node), context, visitedVariables)
		|| isBooleanTypeInformation(node, context);
}

function isBooleanTypeScriptExpression(node, context, visitedVariables) {
	const scope = context.sourceCode.getScope(node);

	return isBooleanTypeAnnotation(node.typeAnnotation, context, scope)
		|| (
			(node.type === 'TSSatisfiesExpression' || ['TSAnyKeyword', 'TSUnknownKeyword'].includes(node.typeAnnotation.type))
			&& isBooleanExpression(node.expression, context, visitedVariables)
		)
		|| isBooleanTypeInformation(node, context);
}

function getKnownLiteralExpressionKind(node) {
	if (typeof node.value === 'string') {
		return 'string';
	}

	if (node.regex) {
		return 'regexp';
	}
}

function getKnownConstructorExpressionKind(node, context) {
	if (
		node.callee.type !== 'Identifier'
		|| !context.sourceCode.isGlobalReference(node.callee)
	) {
		return;
	}

	if (node.callee.name === 'RegExp') {
		return 'regexp';
	}

	if (['Map', 'WeakMap'].includes(node.callee.name)) {
		return 'map';
	}

	if (node.callee.name === 'Set') {
		return 'set';
	}

	if (node.callee.name === 'WeakSet') {
		return 'weakSet';
	}
}

function getTypeCheckedExpressionKind(node, context) {
	for (const [kind, isTarget] of expressionKindCheckers) {
		if (isTarget(node, context)) {
			return kind;
		}
	}
}

function getKnownIdentifierExpressionKind(node, context, visitedVariables) {
	const kind = getTypeCheckedExpressionKind(node, context);
	if (kind || getJSDocumentTypeAnnotation(node, context)) {
		return kind;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const [definition] = variable?.defs ?? [];
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
		|| !isSimpleConstVariableDefinition(definition)
	) {
		return;
	}

	visitedVariables.add(variable);
	const result = getKnownExpressionKind(definition.node.init, context, visitedVariables);
	visitedVariables.delete(variable);
	return result;
}

function getKnownExpressionKind(node, context, visitedVariables = new Set()) {
	switch (node?.type) {
		case 'ArrayExpression': {
			return 'array';
		}

		case 'Literal': {
			return getKnownLiteralExpressionKind(node);
		}

		case 'TemplateLiteral': {
			return 'string';
		}

		case 'NewExpression': {
			return getKnownConstructorExpressionKind(node, context) ?? getTypeCheckedExpressionKind(node, context);
		}

		case 'Identifier': {
			return getKnownIdentifierExpressionKind(node, context, visitedVariables);
		}

		// `ParenthesizedExpression` only comes from `@babel/eslint-parser` with `createParenthesizedExpressions`, which the tests do not use.
		/* node:coverage ignore next */
		case 'ParenthesizedExpression':
		case 'TSNonNullExpression':
		case 'TSSatisfiesExpression': {
			return getKnownExpressionKind(node.expression, context, visitedVariables);
		}

		default: {
			return getTypeCheckedExpressionKind(node, context);
		}
	}
}

function isBooleanWrappedExpression(node, context, visitedVariables) {
	switch (node.type) {
		// A `yield` expression evaluates to the value sent back into the generator via `.next()`, not the yielded argument, so its type is unknown.
		case 'AwaitExpression':
		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return isBooleanExpression(node.argument ?? node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return isBooleanExpression(node.expressions.at(-1), context, visitedVariables);
		}

		case 'AssignmentExpression': {
			return node.operator === '=' && isBooleanExpression(node.right, context, visitedVariables);
		}

		default: {
			break;
		}
	}
}

function isKnownBooleanStaticMethodCall(node, context) {
	if (
		node.callee.type !== 'MemberExpression'
		|| node.callee.object.type !== 'Identifier'
		|| !context.sourceCode.isGlobalReference(node.callee.object)
	) {
		return false;
	}

	const methods = booleanStaticMethods.get(node.callee.object.name);
	const method = getPropertyName(node.callee, context.sourceCode.getScope(node.callee));
	return Boolean(methods?.has(method));
}

function isKnownBooleanFunctionReference(node, context) {
	if (node.type === 'Identifier') {
		return (
			(node.name === 'Boolean' || booleanGlobalFunctions.has(node.name))
			&& context.sourceCode.isGlobalReference(node)
		);
	}

	if (
		node.type !== 'MemberExpression'
		|| node.optional
		|| node.object.type !== 'Identifier'
		|| !context.sourceCode.isGlobalReference(node.object)
	) {
		return false;
	}

	const methods = booleanStaticMethods.get(node.object.name);
	const method = getPropertyName(node, context.sourceCode.getScope(node));
	return Boolean(methods?.has(method));
}

function isKnownBooleanInstanceMethodCall(node, context) {
	if (node.callee.type !== 'MemberExpression') {
		return false;
	}

	const methods = booleanMethodsByExpressionKind.get(getKnownExpressionKind(node.callee.object, context));
	const method = getPropertyName(node.callee, context.sourceCode.getScope(node.callee));
	return Boolean(methods?.has(method));
}

function isKnownBooleanPropertyRead(node, context) {
	if (
		node.type !== 'MemberExpression'
		|| node.optional
	) {
		return false;
	}

	const properties = booleanPropertiesByExpressionKind.get(getKnownExpressionKind(node.object, context));
	const property = getPropertyName(node, context.sourceCode.getScope(node));
	return Boolean(properties?.has(property));
}

function isBooleanCallExpression(node, context, visitedVariables) {
	if (
		isKnownBooleanStaticMethodCall(node, context)
		|| isKnownBooleanInstanceMethodCall(node, context)
	) {
		return true;
	}

	if (node.callee.type !== 'Identifier') {
		return isBooleanTypeInformation(node, context);
	}

	if (node.callee.name === 'Boolean' && context.sourceCode.isGlobalReference(node.callee)) {
		return true;
	}

	if (booleanGlobalFunctions.has(node.callee.name) && context.sourceCode.isGlobalReference(node.callee)) {
		return true;
	}

	return isBooleanFunctionReference(node.callee, context, visitedVariables)
		|| isBooleanTypeInformation(node, context);
}

function isBooleanExpressionBySyntax(node, context, visitedVariables) {
	switch (node.type) {
		case 'Identifier': {
			return isBooleanIdentifier(node, context, visitedVariables);
		}

		case 'UnaryExpression': {
			return ['!', 'delete'].includes(node.operator);
		}

		case 'LogicalExpression': {
			return isBooleanExpression(node.left, context, visitedVariables)
				&& isBooleanExpression(node.right, context, visitedVariables);
		}

		case 'BinaryExpression': {
			return booleanBinaryOperators.has(node.operator);
		}

		case 'ConditionalExpression': {
			return isBooleanExpression(node.consequent, context, visitedVariables)
				&& isBooleanExpression(node.alternate, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion':
		case 'TSSatisfiesExpression': {
			return isBooleanTypeScriptExpression(node, context, visitedVariables);
		}

		case 'CallExpression': {
			return isBooleanCallExpression(node, context, visitedVariables);
		}

		case 'MemberExpression': {
			return isKnownBooleanPropertyRead(node, context) || undefined;
		}

		default: {
			return isBooleanWrappedExpression(node, context, visitedVariables);
		}
	}
}

function isBooleanExpression(node, context, visitedVariables = new Set()) {
	if (!node) {
		return false;
	}

	const annotation = getJSDocumentTypeAnnotation(node, context);
	if (annotation) {
		return getJSDocumentBooleanState(annotation) === 'boolean' || isBooleanTypeInformation(node, context);
	}

	if (
		(node.typeAnnotation && isBooleanTypeAnnotation(node.typeAnnotation, context, context.sourceCode.getScope(node)))
		|| isBooleanStaticValue(node, context)
	) {
		return true;
	}

	return isBooleanExpressionBySyntax(node, context, visitedVariables)
		?? isBooleanTypeInformation(node, context);
}

export {
	isBooleanExpression,
	isBooleanFunction,
	isBooleanFunctionReference,
	isBooleanFunctionTypeAnnotation,
	isKnownBooleanFunctionReference,
	isBooleanTypeAnnotation,
	isFunctionTypeAnnotation,
};

export default isBooleanExpression;
