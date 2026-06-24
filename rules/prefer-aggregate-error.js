import {isNewExpression, isMemberExpression, isLiteral} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';
import {
	getVariableByName,
	isArray,
	isGlobalIdentifier,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
} from './utils/types.js';

const MESSAGE_ID = 'prefer-aggregate-error';
const messages = {
	[MESSAGE_ID]: 'Use `AggregateError` when throwing collected errors.',
};

const errorCollectionNamePattern = /[Ee]rrors$|[Ee]rror(?:List|Array|Collection)$/u;
const errorConstructorNames = new Set(builtinErrors);

const isErrorCollectionName = name => errorCollectionNamePattern.test(name);

function unwrapExpression(node) {
	while (node?.type === 'ParenthesizedExpression') {
		node = node.expression;
	}

	return unwrapTypeScriptExpression(node);
}

const isAvailableGlobalName = (name, node, context) => {
	const variable = getVariableByName(name, context.sourceCode.getScope(node));
	return !variable || variable.defs.length === 0;
};

const isLocallyDefined = variable =>
	(variable?.defs.length ?? 0) > 0;

function getTypeName(typeName) {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
}

function unwrapTypeAnnotation(node) {
	node = node?.type === 'TSTypeAnnotation'
		? node.typeAnnotation
		: node;

	if (node?.type === 'TSTypeOperator' && node.operator === 'readonly') {
		node = node.typeAnnotation;
	}

	return node?.type === 'TSParenthesizedType'
		? unwrapTypeAnnotation(node.typeAnnotation)
		: node;
}

function getTupleElementTypeAnnotation(node) {
	if (node.type === 'TSNamedTupleMember') {
		return node.elementType;
	}

	return node.type === 'TSRestType'
		? node.typeAnnotation
		: node;
}

function isErrorTypeAnnotation(node, scope, context, visitedTypeNames = new Set()) {
	node = unwrapTypeAnnotation(node);

	switch (node?.type) {
		case 'TSTypeReference': {
			const typeName = getTypeName(node.typeName);
			if (!typeName) {
				return false;
			}

			const variable = getVariableByName(typeName, scope);
			if (
				errorConstructorNames.has(typeName)
				&& !isLocallyDefined(variable)
			) {
				return true;
			}

			if (visitedTypeNames.has(typeName)) {
				return false;
			}

			visitedTypeNames.add(typeName);

			const [definition] = variable?.defs ?? [];
			const definitionScope = definition ? context.sourceCode.getScope(definition.name) : scope;
			const isError = (
				definition?.type === 'Type'
				&& definition.node.type === 'TSTypeAliasDeclaration'
				&& isErrorTypeAnnotation(definition.node.typeAnnotation, definitionScope, context, visitedTypeNames)
			);

			visitedTypeNames.delete(typeName);

			return isError;
		}

		case 'TSUnionType': {
			return node.types.every(type => isErrorTypeAnnotation(type, scope, context, visitedTypeNames));
		}

		case 'TSIntersectionType': {
			return node.types.some(type => isErrorTypeAnnotation(type, scope, context, visitedTypeNames));
		}

		default: {
			return false;
		}
	}
}

function isErrorArrayTypeReferenceAnnotation(node, scope, context, visitedTypeNames) {
	const typeName = getTypeName(node.typeName);
	const typeArguments = node.typeArguments?.params ?? node.typeParameters?.params;
	if (
		(typeName === 'Array' || typeName === 'ReadonlyArray')
		&& typeArguments?.length === 1
	) {
		return isErrorTypeAnnotation(typeArguments[0], scope, context, visitedTypeNames);
	}

	if (!typeName || visitedTypeNames.has(typeName)) {
		return false;
	}

	visitedTypeNames.add(typeName);

	const variable = getVariableByName(typeName, scope);
	const [definition] = variable?.defs ?? [];
	const definitionScope = definition ? context.sourceCode.getScope(definition.name) : scope;
	const isErrorArray = (
		definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isErrorArrayTypeAnnotation(definition.node.typeAnnotation, definitionScope, context, visitedTypeNames)
	);

	visitedTypeNames.delete(typeName);

	return isErrorArray;
}

function isErrorArrayTypeAnnotation(node, scope, context, visitedTypeNames = new Set()) {
	node = unwrapTypeAnnotation(node);

	switch (node?.type) {
		case 'TSArrayType': {
			return isErrorTypeAnnotation(node.elementType, scope, context, visitedTypeNames);
		}

		case 'TSTupleType': {
			return node.elementTypes.length > 0
				&& node.elementTypes.every(elementType => isErrorTypeAnnotation(getTupleElementTypeAnnotation(elementType), scope, context, visitedTypeNames));
		}

		case 'TSTypeReference': {
			return isErrorArrayTypeReferenceAnnotation(node, scope, context, visitedTypeNames);
		}

		case 'TSUnionType': {
			return node.types.every(type => isErrorArrayTypeAnnotation(type, scope, context, visitedTypeNames));
		}

		case 'TSIntersectionType': {
			return node.types.some(type => isErrorArrayTypeAnnotation(type, scope, context, visitedTypeNames));
		}

		default: {
			return false;
		}
	}
}

function isErrorType(type, checker, program, visitedTypes = new Set()) {
	if (!type || visitedTypes.has(type)) {
		return false;
	}

	visitedTypes.add(type);

	if (type.isUnion()) {
		return type.types.every(type => isErrorType(type, checker, program, visitedTypes));
	}

	if (type.isIntersection()) {
		return type.types.some(type => isErrorType(type, checker, program, visitedTypes));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isErrorType(constraint, checker, program, visitedTypes);
	}

	const symbol = getTypeSymbol(type);
	if (
		errorConstructorNames.has(symbol?.getName())
		&& isDefaultLibrarySymbol(symbol, program)
	) {
		return true;
	}

	return getBaseTypes(type, checker).some(type => isErrorType(type, checker, program, visitedTypes));
}

function isErrorArrayType(type, checker, program, visitedTypes = new Set()) {
	if (!type || visitedTypes.has(type)) {
		return false;
	}

	visitedTypes.add(type);

	if (type.isUnion()) {
		return type.types.every(type => isErrorArrayType(type, checker, program, visitedTypes));
	}

	if (type.isIntersection()) {
		return type.types.some(type => isErrorArrayType(type, checker, program, visitedTypes));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isErrorArrayType(constraint, checker, program, visitedTypes);
	}

	if (!(checker.isArrayType(type) || checker.isTupleType(type))) {
		return false;
	}

	const typeArguments = checker.getTypeArguments(type);
	return typeArguments.length > 0
		&& typeArguments.every(type => isErrorType(type, checker, program));
}

function isErrorArrayTypeFromTypeInformation(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const {program} = parserServices;
		return isErrorArrayType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {
		return false;
	}
}

function hasErrorCollectionEvidence(node, context) {
	const variable = getVariableByName(node.name, context.sourceCode.getScope(node));
	const [definition] = variable?.defs ?? [];
	const definitionScope = definition ? context.sourceCode.getScope(definition.name) : context.sourceCode.getScope(node);

	return isErrorArrayTypeAnnotation(definition?.name?.typeAnnotation, definitionScope, context)
		|| isErrorArrayTypeFromTypeInformation(node, context);
}

const getLoneThrowStatement = node => {
	if (node.type === 'ThrowStatement') {
		return node;
	}

	if (
		node.type === 'BlockStatement'
		&& node.body.length === 1
		&& node.body[0].type === 'ThrowStatement'
	) {
		return node.body[0];
	}
};

function getLengthObject(node, context) {
	node = unwrapExpression(node);

	if (!(
		isMemberExpression(node, {
			property: 'length',
			optional: false,
		})
		&& node.object.type === 'Identifier'
		&& isErrorCollectionName(node.object.name)
		&& isArray(node.object, context)
		&& hasErrorCollectionEvidence(node.object, context)
	)) {
		return;
	}

	return node.object;
}

const isNumberLiteral = (node, value) =>
	isLiteral(unwrapExpression(node), value);

const getNumberLiteralValue = node => {
	node = unwrapExpression(node);

	return node?.type === 'Literal' && typeof node.value === 'number'
		? node.value
		: undefined;
};

const isPositiveLengthComparison = (operator, valueNode, lengthOnLeft) => {
	if (
		(operator === '!==' || operator === '!=')
		&& isNumberLiteral(valueNode, 0)
	) {
		return true;
	}

	const value = getNumberLiteralValue(valueNode);
	if (value === undefined) {
		return false;
	}

	if (lengthOnLeft) {
		return (
			(operator === '>' && value >= 0)
			|| (operator === '>=' && value >= 1)
		);
	}

	return (
		(operator === '<' && value >= 0)
		|| (operator === '<=' && value >= 1)
	);
};

function getPositiveLengthCheckObject(node, context) {
	node = unwrapExpression(node);

	const lengthObject = getLengthObject(node, context);
	if (lengthObject) {
		return lengthObject;
	}

	if (node.type !== 'BinaryExpression') {
		return;
	}

	const leftLengthObject = getLengthObject(node.left, context);
	if (
		leftLengthObject
		&& isPositiveLengthComparison(node.operator, node.right, true)
	) {
		return leftLengthObject;
	}

	const rightLengthObject = getLengthObject(node.right, context);
	if (
		rightLengthObject
		&& isPositiveLengthComparison(node.operator, node.left, false)
	) {
		return rightLengthObject;
	}
}

const getAndOperands = node => {
	node = unwrapExpression(node);

	if (
		node.type !== 'LogicalExpression'
		|| node.operator !== '&&'
	) {
		return [node];
	}

	return [
		...getAndOperands(node.left),
		...getAndOperands(node.right),
	];
};

function getGuardedErrorCollection(node, context) {
	const errorCollections = getAndOperands(node.test)
		.map(operand => getPositiveLengthCheckObject(operand, context))
		.filter(Boolean);

	if (errorCollections.length !== 1) {
		return;
	}

	return errorCollections[0];
}

function getThrownErrorExpression(throwStatement, context) {
	const newExpression = throwStatement.argument;

	if (!(
		isNewExpression(newExpression, {
			name: 'Error',
			maximumArguments: 2,
		})
		&& isGlobalIdentifier(newExpression.callee, context)
	)) {
		return;
	}

	return newExpression;
}

const hasCommentsInside = (node, context) =>
	context.sourceCode.getCommentsInside(node).length > 0;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', node => {
		const throwStatement = getLoneThrowStatement(node.consequent);
		if (!throwStatement) {
			return;
		}

		const errorExpression = getThrownErrorExpression(throwStatement, context);
		if (!errorExpression) {
			return;
		}

		const errorCollection = getGuardedErrorCollection(node, context);
		if (
			!errorCollection
			|| !isAvailableGlobalName('AggregateError', errorExpression, context)
		) {
			return;
		}

		const {sourceCode} = context;
		return {
			node: errorExpression.callee,
			messageId: MESSAGE_ID,
			fix: hasCommentsInside(errorExpression, context)
				? undefined
				: fixer => {
					const argumentsText = [
						sourceCode.getText(errorCollection),
						...errorExpression.arguments.map(argument => sourceCode.getText(argument)),
					].join(', ');

					return fixer.replaceText(errorExpression, `new AggregateError(${argumentsText})`);
				},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `AggregateError` when throwing collected errors.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
