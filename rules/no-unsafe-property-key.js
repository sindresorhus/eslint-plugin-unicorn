import {findVariable, getPropertyName, getStaticValue} from '@eslint-community/eslint-utils';
import {
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
} from './utils/type-helpers.js';
import {
	getVariableByName,
	isArray,
	isGlobalIdentifier,
} from './utils/index.js';
import {
	disallowNew as disallowNewBuiltins,
	enforceNew as enforceNewBuiltins,
} from './utils/builtins.js';
import builtinErrors from './shared/builtin-errors.js';
import {
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isStringMappingType,
	isTemplateLiteralType,
	isUniqueSymbolType,
} from './utils/types.js';

const MESSAGE_ID = 'no-unsafe-property-key';
const messages = {
	[MESSAGE_ID]: 'Do not use an unsafe value as a property key. Use an explicit string or symbol key instead.',
};

const propertyDefinitionNodeTypes = [
	'Property',
	'MethodDefinition',
	'PropertyDefinition',
	'AccessorProperty',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
	'TSAbstractAccessorProperty',
];

const unsafeGlobalIdentifiers = new Set([
	...disallowNewBuiltins,
	...enforceNewBuiltins,
	...builtinErrors,
	'Atomics',
	'decodeURI',
	'decodeURIComponent',
	'encodeURI',
	'encodeURIComponent',
	'eval',
	'globalThis',
	'Infinity',
	'Intl',
	'isFinite',
	'isNaN',
	'JSON',
	'Math',
	'NaN',
	'parseFloat',
	'parseInt',
	'Reflect',
	'WebAssembly',
]);

const isBigIntLiteral = node =>
	(node?.type === 'Literal' && typeof node.value === 'bigint')
	|| (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& node.argument.type === 'Literal'
		&& typeof node.argument.value === 'bigint'
	);

function getNumberLiteralValue(node) {
	if (node?.type === 'Literal' && typeof node.value === 'number') {
		return node.value;
	}

	if (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& node.argument.type === 'Literal'
		&& typeof node.argument.value === 'number'
	) {
		return -node.argument.value;
	}
}

const isUnsafeNumber = value =>
	typeof value === 'number'
	&& !Number.isSafeInteger(value)
	&& (!Number.isFinite(value) || Object.is(value, Math.trunc(value)));

const isUnsafeNumberLiteral = node =>
	isUnsafeNumber(getNumberLiteralValue(node));

const isUnsafePropertyKeyNode = node =>
	node.type === 'ObjectExpression'
	|| node.type === 'ArrayExpression'
	|| node.type === 'FunctionExpression'
	|| node.type === 'ArrowFunctionExpression'
	|| node.type === 'ClassExpression'
	|| node.type === 'NewExpression'
	|| isBigIntLiteral(node)
	|| isUnsafeNumberLiteral(node);

function isUnsafePropertyKeyTypeAnnotation(node) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isUnsafePropertyKeyTypeAnnotation(node.typeAnnotation);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				&& isUnsafePropertyKeyTypeAnnotation(node.typeAnnotation);
		}

		case 'TSBigIntKeyword':
		case 'TSObjectKeyword':
		case 'TSArrayType':
		case 'TSTupleType': {
			return true;
		}

		case 'TSFunctionType':
		case 'TSConstructorType': {
			return true;
		}

		case 'TSLiteralType': {
			return isBigIntLiteral(node.literal) || isUnsafeNumberLiteral(node.literal);
		}

		default: {
			return false;
		}
	}
}

const isUnsafeStaticValue = value =>
	typeof value === 'bigint'
	|| isUnsafeNumber(value)
	|| (typeof value === 'object' && value !== null);

const isSafeStaticValue = value =>
	value === null
	|| typeof value === 'string'
	|| typeof value === 'symbol'
	|| typeof value === 'boolean'
	|| value === undefined
	|| (typeof value === 'number' && !isUnsafeNumber(value));

function getStaticType(value) {
	if (isUnsafeStaticValue(value)) {
		return target;
	}

	if (isSafeStaticValue(value)) {
		return nonTarget;
	}

	return unknown;
}

function isUnsafePropertyKeyType(type, checker, program) {
	// A `unique symbol` (including well-known symbols like `Symbol.iterator`) is a safe key, but has no `intrinsicName` and resolves to a default-library symbol, so the checks below would otherwise wrongly flag it.
	if (isUniqueSymbolType(type)) {
		return false;
	}

	// Intrinsic string-mapping types (`Uppercase<string>`, `Lowercase<string>`, etc.) are string subtypes and safe keys, but their symbol resolves to a default-library symbol, which the check below would otherwise wrongly flag.
	if (isStringMappingType(type)) {
		return false;
	}

	if (
		type.isBigIntLiteral?.()
		|| (type.isNumberLiteral?.() && isUnsafeNumber(type.value))
		|| checker.isArrayType(type)
		|| checker.isTupleType(type)
	) {
		return true;
	}

	if (type.intrinsicName) {
		return type.intrinsicName === 'bigint'
			|| type.intrinsicName === 'object';
	}

	if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
		return true;
	}

	return isDefaultLibrarySymbol(getTypeSymbol(type), program);
}

function isPossiblyUnsafePropertyKeyType(type, checker, program) {
	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();

		return constraint ? isPossiblyUnsafePropertyKeyType(constraint, checker, program) : false;
	}

	if (type.isUnion()) {
		return type.types.some(type => isPossiblyUnsafePropertyKeyType(type, checker, program));
	}

	if (type.isIntersection()) {
		return type.types.every(type => isPossiblyUnsafePropertyKeyType(type, checker, program));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isPossiblyUnsafePropertyKeyType(constraint, checker, program);
	}

	if (isTemplateLiteralType(type)) {
		return false;
	}

	// A `unique symbol` type has no `intrinsicName` but exposes `Symbol.prototype` members, so the property-count heuristic below would wrongly flag it.
	if (isUniqueSymbolType(type)) {
		return false;
	}

	if (
		type.isStringLiteral?.()
		|| type.isNumberLiteral?.()
		|| type.isBooleanLiteral?.()
	) {
		return isUnsafePropertyKeyType(type, checker, program);
	}

	return isUnsafePropertyKeyType(type, checker, program)
		|| (!type.intrinsicName && type.getProperties().length > 0);
}

function isPossiblyUnsafePropertyKeyTypeFromTypeInformation(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const {program} = parserServices;
		return isPossiblyUnsafePropertyKeyType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {
		return false;
	}
}

const {
	isTarget: isUnsafePropertyKey,
} = createTypeCheckers({
	targetTypeNames: new Set([
		'Array',
		'ReadonlyArray',
	]),
	isTargetNode: isUnsafePropertyKeyNode,
	isTargetTypeAnnotation: isUnsafePropertyKeyTypeAnnotation,
	isTargetType: isUnsafePropertyKeyType,
	getStaticType,
});

const isUnsafeGlobalIdentifier = (node, context) =>
	unsafeGlobalIdentifiers.has(node.name)
	&& isGlobalIdentifier(node, context);

function isUnsafeGlobalThisProperty(node, context) {
	if (
		node.type !== 'MemberExpression'
		|| node.object.type !== 'Identifier'
		|| node.object.name !== 'globalThis'
		|| !isGlobalIdentifier(node.object, context)
	) {
		return false;
	}

	const propertyName = getPropertyName(node, context.sourceCode.getScope(node));
	return unsafeGlobalIdentifiers.has(propertyName);
}

function isTypeScriptEnumMemberAccess(node, context) {
	return node.type === 'MemberExpression'
		&& node.object.type === 'Identifier'
		&& findVariable(context.sourceCode.getScope(node.object), node.object)?.defs.some(definition => definition.type === 'TSEnumName');
}

function getTypeName(typeName) {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
}

function isUnsafeInterfaceTypeAnnotation(node, scope, sourceCode, visitedTypeNames) {
	return node.body.body.length > 0
		|| node.extends.some(node => isUnsafePropertyKeyTypeAnnotationWithScope({type: 'TSTypeReference', typeName: node.expression}, scope, sourceCode, visitedTypeNames));
}

function isUnsafePropertyKeyTypeReferenceWithScope(node, scope, sourceCode, visitedTypeNames) {
	const typeReferenceName = getTypeName(node.typeName);
	if (!typeReferenceName || visitedTypeNames.has(typeReferenceName)) {
		return false;
	}

	if (typeReferenceName === 'Array' || typeReferenceName === 'ReadonlyArray') {
		return true;
	}

	visitedTypeNames.add(typeReferenceName);

	const typeVariable = getVariableByName(typeReferenceName, scope);
	const [definition] = typeVariable?.defs ?? [];
	let isUnsafe = false;
	const definitionScope = definition ? sourceCode.getScope(definition.name) : scope;

	if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		isUnsafe = isUnsafePropertyKeyTypeAnnotationWithScope(definition.node.typeAnnotation, definitionScope, sourceCode, visitedTypeNames);
	} else if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		isUnsafe = isUnsafeInterfaceTypeAnnotation(definition.node, definitionScope, sourceCode, visitedTypeNames);
	} else if (definition?.type === 'ClassName') {
		isUnsafe = true;
	}

	visitedTypeNames.delete(typeReferenceName);

	return isUnsafe;
}

function isUnsafePropertyKeyTypeAnnotationWithScope(node, scope, sourceCode, visitedTypeNames = new Set()) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isUnsafePropertyKeyTypeAnnotationWithScope(node.typeAnnotation, scope, sourceCode, visitedTypeNames);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				&& isUnsafePropertyKeyTypeAnnotationWithScope(node.typeAnnotation, scope, sourceCode, visitedTypeNames);
		}

		case 'TSTypeLiteral': {
			return node.members.length > 0;
		}

		case 'TSTypeReference': {
			return isUnsafePropertyKeyTypeReferenceWithScope(node, scope, sourceCode, visitedTypeNames);
		}

		case 'TSUnionType': {
			return node.types.some(node => isUnsafePropertyKeyTypeAnnotationWithScope(node, scope, sourceCode, visitedTypeNames));
		}

		case 'TSIntersectionType': {
			return node.types.every(node => isUnsafePropertyKeyTypeAnnotationWithScope(node, scope, sourceCode, visitedTypeNames));
		}

		default: {
			return isUnsafePropertyKeyTypeAnnotation(node);
		}
	}
}

function getUnsafeDefinitionType(variable) {
	const [definition] = variable?.defs ?? [];

	return definition?.type === 'FunctionName'
		|| definition?.type === 'ClassName'
		|| definition?.type === 'TSEnumName'
		? target
		: unknown;
}

function getConstantIdentifierValueNode(variable, visitedVariables) {
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return;
	}

	return definition.node.init;
}

function getIdentifierStaticPropertyKeyType(node, context, visitedVariables) {
	if (isUnsafeGlobalIdentifier(node, context)) {
		return target;
	}

	const scope = context.sourceCode.getScope(node);
	const variable = findVariable(scope, node);
	const definitionType = getUnsafeDefinitionType(variable);
	if (definitionType !== unknown) {
		return definitionType;
	}

	const [definition] = variable?.defs ?? [];
	const valueNode = getConstantIdentifierValueNode(variable, visitedVariables);
	if (valueNode) {
		visitedVariables.add(variable);
		const type = getStaticPropertyKeyType(valueNode, context, visitedVariables);
		visitedVariables.delete(variable);

		if (type !== unknown) {
			return type;
		}
	}

	const definitionScope = definition ? context.sourceCode.getScope(definition.name) : scope;
	return isUnsafePropertyKeyTypeAnnotationWithScope(definition?.name?.typeAnnotation, definitionScope, context.sourceCode)
		? target
		: unknown;
}

function getConditionalStaticPropertyKeyType(node, context, visitedVariables) {
	const consequentType = getStaticPropertyKeyType(node.consequent, context, visitedVariables);
	const alternateType = getStaticPropertyKeyType(node.alternate, context, visitedVariables);

	if (consequentType === target || alternateType === target) {
		return target;
	}

	return consequentType === nonTarget && alternateType === nonTarget
		? nonTarget
		: unknown;
}

function getExpressionStaticPropertyKeyType(node, context) {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	const isUnsafe = isUnsafePropertyKeyNode(node)
		|| isUnsafeGlobalThisProperty(node, context)
		|| isArray(node, context)
		|| (staticValue ? getStaticType(staticValue.value) === target : false);

	if (isUnsafe) {
		return target;
	}

	return staticValue ? getStaticType(staticValue.value) : unknown;
}

function getStaticPropertyKeyType(node, context, visitedVariables = new Set()) {
	switch (node.type) {
		case 'TemplateLiteral': {
			return nonTarget;
		}

		case 'Identifier': {
			return getIdentifierStaticPropertyKeyType(node, context, visitedVariables);
		}

		case 'MemberExpression': {
			return isTypeScriptEnumMemberAccess(node, context)
				? nonTarget
				: getExpressionStaticPropertyKeyType(node, context);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion':
		case 'TSSatisfiesExpression': {
			const type = getStaticPropertyKeyType(node.expression, context, visitedVariables);
			if (type !== unknown) {
				return type;
			}

			return isUnsafePropertyKeyTypeAnnotationWithScope(node.typeAnnotation, context.sourceCode.getScope(node), context.sourceCode)
				? target
				: unknown;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getStaticPropertyKeyType(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getStaticPropertyKeyType(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return getConditionalStaticPropertyKeyType(node, context, visitedVariables);
		}

		default: {
			return getExpressionStaticPropertyKeyType(node, context);
		}
	}
}

function getPropertyKeyProblem(node, context) {
	const staticType = getStaticPropertyKeyType(node, context);
	if (staticType === nonTarget) {
		return;
	}

	if (
		staticType !== target
		&& !isPossiblyUnsafePropertyKeyTypeFromTypeInformation(node, context)
		&& !isUnsafePropertyKey(node, context)
	) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
	};
}

function shouldCheckPropertyDefinitionKey(node) {
	return node.computed || isBigIntLiteral(node.key) || isUnsafeNumberLiteral(node.key);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		if (!node.computed) {
			return;
		}

		return getPropertyKeyProblem(node.property, context);
	});

	for (const nodeType of propertyDefinitionNodeTypes) {
		context.on(nodeType, node => {
			if (!shouldCheckPropertyDefinitionKey(node)) {
				return;
			}

			return getPropertyKeyProblem(node.key, context);
		});
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unsafe values as property keys.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
