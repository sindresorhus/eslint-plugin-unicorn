import {findVariable, getPropertyName, getStaticValue} from '@eslint-community/eslint-utils';
import resolveVariableName from './resolve-variable-name.js';

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

const isBooleanStaticValue = (node, context) =>
	typeof getStaticValue(node, context.sourceCode.getScope(node))?.value === 'boolean';

function isBooleanTypeScriptType(type, checker) {
	if (!type) {
		return false;
	}

	if (type.isUnion?.()) {
		return type.types.every(type => isBooleanTypeScriptType(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isBooleanTypeScriptType(constraint, checker);
	}

	return booleanTypeStrings.has(checker.typeToString(type));
}

function isBooleanTypeInformation(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		return isBooleanTypeScriptType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		return false;
	}
}

function getTypeReferenceName(typeName) {
	if (typeName?.type === 'Identifier') {
		return typeName.name;
	}
}

function isBooleanCallSignatureMembers(members, context, scope, visitedTypeReferenceNames) {
	const callSignatures = members.filter(member => member.type === 'TSCallSignatureDeclaration');

	return callSignatures.length > 0
		&& callSignatures.every(member => isBooleanTypeAnnotation(member.returnType, context, scope, visitedTypeReferenceNames));
}

function isBooleanTypeReference(node, context, scope, visitedTypeReferenceNames) {
	const name = getTypeReferenceName(node.typeName);
	if (!name || visitedTypeReferenceNames.has(name)) {
		return false;
	}

	visitedTypeReferenceNames.add(name);

	const variable = resolveVariableName(name, scope);
	const [definition] = variable?.defs ?? [];
	const definitionScope = definition?.type === 'Type'
		? context.sourceCode.getScope(definition.node)
		: scope;
	const result = definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isBooleanTypeAnnotation(definition.node.typeAnnotation, context, definitionScope, visitedTypeReferenceNames);

	visitedTypeReferenceNames.delete(name);
	return result;
}

function isBooleanFunctionTypeReference(node, context, scope, visitedTypeReferenceNames) {
	const name = getTypeReferenceName(node.typeName);
	if (!name || visitedTypeReferenceNames.has(name)) {
		return false;
	}

	visitedTypeReferenceNames.add(name);

	const variable = resolveVariableName(name, scope);
	const [definition] = variable?.defs ?? [];
	const definitionScope = definition?.type === 'Type'
		? context.sourceCode.getScope(definition.node)
		: scope;
	const result = definition?.type === 'Type'
		&& (
			(
				definition.node.type === 'TSTypeAliasDeclaration'
				&& isBooleanFunctionTypeAnnotation(definition.node.typeAnnotation, context, definitionScope, visitedTypeReferenceNames)
			)
			|| (
				definition.node.type === 'TSInterfaceDeclaration'
				&& isBooleanCallSignatureMembers(definition.node.body.body, context, definitionScope, visitedTypeReferenceNames)
			)
		);

	visitedTypeReferenceNames.delete(name);
	return result;
}

function isBooleanTypeAnnotation(node, context, scope, visitedTypeReferenceNames = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBooleanTypeAnnotation(node.typeAnnotation, context, scope, visitedTypeReferenceNames);
		}

		case 'TSBooleanKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return typeof node.literal.value === 'boolean';
		}

		case 'TSTypeReference': {
			return isBooleanTypeReference(node, context, scope, visitedTypeReferenceNames);
		}

		case 'TSTypePredicate': {
			return !node.asserts;
		}

		case 'TSUnionType': {
			return node.types.every(type => isBooleanTypeAnnotation(type, context, scope, visitedTypeReferenceNames));
		}

		case 'TypeAnnotation': {
			return node.typeAnnotation?.type === 'BooleanTypeAnnotation';
		}

		default: {
			return false;
		}
	}
}

function isBooleanFunctionTypeAnnotation(node, context, scope, visitedTypeReferenceNames = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope, visitedTypeReferenceNames);
		}

		case 'TSFunctionType': {
			return isBooleanTypeAnnotation(node.returnType, context, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeLiteral': {
			return isBooleanCallSignatureMembers(node.members, context, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeReference': {
			return isBooleanFunctionTypeReference(node, context, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return node.types.every(type => isBooleanFunctionTypeAnnotation(type, context, scope, visitedTypeReferenceNames));
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

	const scope = context.sourceCode.getScope(node);
	if (isBooleanTypeAnnotation(node.returnType, context, scope)) {
		return true;
	}

	if (!node.body) {
		return false;
	}

	if (
		node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
	) {
		return isBooleanExpression(node.body.body[0].argument, context, visitedVariables);
	}

	return node.type === 'ArrowFunctionExpression'
		&& node.body.type !== 'BlockStatement'
		&& isBooleanExpression(node.body, context, visitedVariables);
}

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
		&& variable.defs.every(definition => definition.type === 'FunctionName')
	) {
		const overloadDefinitions = variable.defs.filter(definition => definition.node.type === 'TSDeclareFunction');
		const functionDefinitions = overloadDefinitions.length > 0 ? overloadDefinitions : variable.defs;
		isBoolean = variable.references.every(reference => !reference.writeExpr)
			&& functionDefinitions.every(definition => isBooleanFunction(definition.node, context, visitedVariables));
	} else if (variable.defs.length === 1) {
		const [definition] = variable.defs;
		const scope = context.sourceCode.getScope(definition.name);
		if (isBooleanFunctionTypeAnnotation(definition.name?.typeAnnotation, context, scope)) {
			isBoolean = true;
		} else {
			let functionNode;
			if (definition.type === 'FunctionName') {
				if (variable.references.every(reference => !reference.writeExpr)) {
					functionNode = definition.node;
				}
			} else if (
				definition.type === 'Variable'
				&& definition.parent.kind === 'const'
				&& ['ArrowFunctionExpression', 'FunctionExpression'].includes(definition.node.init?.type)
			) {
				functionNode = definition.node.init;
			}

			isBoolean = functionNode
				? isBooleanFunction(functionNode, context, visitedVariables)
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

	let isBoolean = (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
	)
		? isBooleanExpression(definition.node.init, context, visitedVariables)
		: false;

	if (!isBoolean && definition.type === 'Parameter') {
		const parameter = definition.name.parent;
		isBoolean = parameter.type === 'AssignmentPattern'
			&& parameter.left === definition.name
			// Only a top-level parameter; a binding inside a destructuring pattern carries its type on the pattern, not the default value.
			&& definition.node.params.includes(parameter)
			&& isBooleanExpression(parameter.right, context, visitedVariables);
	}

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
		|| isBooleanExpression(node.expression, context, visitedVariables);
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

function getKnownIdentifierExpressionKind(node, context, visitedVariables) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	const [definition] = variable?.defs ?? [];
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
		|| definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	visitedVariables.add(variable);
	const result = getKnownExpressionKind(definition.node.init, context, visitedVariables);
	visitedVariables.delete(variable);
	return result;
}

function getKnownWrappedExpressionKind(node, context, visitedVariables) {
	return getKnownExpressionKind(node.expression, context, visitedVariables);
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
			return node.expressions.length === 0 ? 'string' : undefined;
		}

		case 'NewExpression': {
			return getKnownConstructorExpressionKind(node, context);
		}

		case 'Identifier': {
			return getKnownIdentifierExpressionKind(node, context, visitedVariables);
		}

		case 'ParenthesizedExpression':
		case 'TSNonNullExpression': {
			return getKnownWrappedExpressionKind(node, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion':
		case 'TSSatisfiesExpression': {
			return getKnownWrappedExpressionKind(node, context, visitedVariables);
		}

		default: {
			break;
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

	const scope = context.sourceCode.getScope(node);
	if (isBooleanTypeAnnotation(node.typeAnnotation, context, scope) || isBooleanStaticValue(node, context)) {
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
};

export default isBooleanExpression;
