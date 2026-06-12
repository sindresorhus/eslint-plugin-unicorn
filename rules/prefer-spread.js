import {
	findVariable,
	getStaticValue,
	isCommaToken,
	isCommentToken,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import {
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
	needsSemicolon,
	isNodeMatches,
	isMethodNamed,
	isSameReference,
	hasOptionalChainElement,
} from './utils/index.js';
import {removeMethodCall} from './fix/index.js';
import {
	isEmptyArrayExpression,
	isFunction,
	isLiteral,
	isMethodCall,
} from './ast/index.js';
import typedArrayTypes from './shared/typed-array.js';

const ERROR_ARRAY_FROM = 'array-from';
const ERROR_ARRAY_CONCAT = 'array-concat';
const ERROR_ARRAY_SLICE = 'array-slice';
const ERROR_ARRAY_TO_SPLICED = 'array-to-spliced';
const SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE = 'argument-is-spreadable';
const SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE = 'argument-is-not-spreadable';
const SUGGESTION_CONCAT_TEST_ARGUMENT = 'test-argument';
const SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS = 'spread-all-arguments';
const messages = {
	[ERROR_ARRAY_FROM]: 'Prefer the spread operator over `Array.from(…)`.',
	[ERROR_ARRAY_CONCAT]: 'Prefer the spread operator over `Array#concat(…)`.',
	[ERROR_ARRAY_SLICE]: 'Prefer the spread operator over `Array#slice()`.',
	[ERROR_ARRAY_TO_SPLICED]: 'Prefer the spread operator over `Array#toSpliced()`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE]: 'First argument is an `array`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE]: 'First argument is not an `array`.',
	[SUGGESTION_CONCAT_TEST_ARGUMENT]: 'Test first argument with `Array.isArray(…)`.',
	[SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS]: 'Spread all unknown arguments.',
};

const ignoredSliceCallee = [
	'arrayBuffer',
	'blob',
	'buffer',
	'file',
	'this',
];
const arrayTypeNames = new Set(['Array', 'ReadonlyArray']);
const knownNonArrayTypeNames = new Set(['ApolloLink', 'Buffer']);
const nonArrayFactoryNames = new Set(['String', 'Number', 'Boolean', 'BigInt', 'RegExp']);
const unknownTypeNames = new Set(['any', 'error', 'unknown']);
const arrayTypeAnnotationTypes = new Set(['TSArrayType', 'TSTupleType']);
const transparentTypeAnnotationTypes = new Set(['TSTypeAnnotation', 'TSParenthesizedType']);
const unknownTypeAnnotationTypes = new Set(['TSAnyKeyword', 'TSUnknownKeyword']);
const typeParameterTypeFlag = 524_288;
const nonArrayTypeAnnotationTypes = new Set([
	'TSNeverKeyword',
	'TSVoidKeyword',
	'TSNullKeyword',
	'TSUndefinedKeyword',
	'TSStringKeyword',
	'TSNumberKeyword',
	'TSBooleanKeyword',
	'TSBigIntKeyword',
	'TSSymbolKeyword',
	'TSObjectKeyword',
	'TSTypeLiteral',
	'TSFunctionType',
	'TSConstructorType',
	'TSLiteralType',
]);

// TypedArray and ArrayBuffer constructors - these have .slice() but spreading them
// either doesn't work (ArrayBuffer has no iterator) or changes the type (TypedArray.slice()
// returns the same typed array, but spreading converts to number[])
const typedArrayConstructors = new Set([
	...typedArrayTypes,
	'ArrayBuffer',
	'SharedArrayBuffer',
]);

/**
Check if node is a TypedArray/ArrayBuffer construction (new Uint8Array(...)).

@param {import('estree').Node} node
@returns {boolean}
*/
function isTypedArrayConstruction(node) {
	return (
		node.type === 'NewExpression'
		&& node.callee.type === 'Identifier'
		&& typedArrayConstructors.has(node.callee.name)
	);
}

const isArrayLiteral = node => node.type === 'ArrayExpression';
const hasArrayHoles = node => node.elements.some(element => element?.type === undefined);
const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});
const isPreferIteratorConcatArrayLiteral = node =>
	isArrayLiteral(node)
	&& node.elements.length >= 2
	&& node.elements.every(element => element?.type === 'SpreadElement')
	&& !node.elements.some(element => isToArrayCall(element.argument));
const isArrayLiteralHasTrailingComma = (node, sourceCode) => {
	if (isEmptyArrayExpression(node)) {
		return false;
	}

	return isCommaToken(sourceCode.getLastToken(node, 1));
};

const isStaticString = (node, scope) => {
	const staticValue = getStaticValue(node, scope);
	return typeof staticValue?.value === 'string';
};

const isArrayLiteralOuterCommentsPreservable = (node, context) => {
	if (hasArrayHoles(node)) {
		return false;
	}

	const parentheses = getParentheses(node, context);
	if (parentheses.length === 0) {
		return false;
	}

	const {sourceCode} = context;
	const hasCommentBetween = (a, b) =>
		sourceCode.getTokensBetween(a, b, {includeComments: true})
			.some(token => isCommentToken(token));

	return hasCommentBetween(parentheses[0], node) || hasCommentBetween(node, parentheses.at(-1));
};

function fixConcat(node, context, fixableArguments) {
	const {sourceCode} = context;
	const array = node.callee.object;
	const concatCallArguments = node.arguments;
	const arrayParenthesizedRange = getParenthesizedRange(array, context);
	const arrayIsArrayLiteral = isArrayLiteral(array);
	const arrayHasTrailingComma = arrayIsArrayLiteral && isArrayLiteralHasTrailingComma(array, sourceCode);

	const getArrayLiteralElementsText = (node, keepTrailingComma) => {
		if (
			!keepTrailingComma
			&& isArrayLiteralHasTrailingComma(node, sourceCode)
		) {
			const start = sourceCode.getRange(node)[0] + 1;
			const [end] = sourceCode.getRange(sourceCode.getLastToken(node, 1));
			return sourceCode.text.slice(start, end);
		}

		return sourceCode.getText(node, -1, -1);
	};

	const getFixedText = () => {
		const nonEmptyArguments = fixableArguments
			.filter(({node, isArrayLiteral}) => (!isArrayLiteral || !isEmptyArrayExpression(node)));
		const lastArgument = nonEmptyArguments.at(-1);

		let text = nonEmptyArguments
			.map(({node, isArrayLiteral, isSpreadable, testArgument}) => {
				if (isArrayLiteral) {
					if (isArrayLiteralOuterCommentsPreservable(node, context)) {
						return `...${getParenthesizedText(node, context)}`;
					}

					return getArrayLiteralElementsText(node, node === lastArgument.node);
				}

				let text = getParenthesizedText(node, context);

				if (testArgument) {
					return `...(Array.isArray(${text}) ? ${text} : [${text}])`;
				}

				if (isSpreadable) {
					text = `...${text}`;
				}

				return text || ' ';
			})
			.join(', ');

		if (!text) {
			return '';
		}

		if (arrayIsArrayLiteral) {
			if (!isEmptyArrayExpression(array)) {
				text = ` ${text}`;

				if (!arrayHasTrailingComma) {
					text = `,${text}`;
				}

				if (
					arrayHasTrailingComma
					&& (!lastArgument.isArrayLiteral || !isArrayLiteralHasTrailingComma(lastArgument.node, sourceCode))
				) {
					text = `${text},`;
				}
			}
		} else {
			text = `, ${text}`;
		}

		return text;
	};

	function removeArguments(fixer) {
		const [firstArgument] = concatCallArguments;
		const lastArgument = concatCallArguments[fixableArguments.length - 1];

		const [start] = getParenthesizedRange(firstArgument, context);
		let [, end] = sourceCode.getRange(sourceCode.getTokenAfter(lastArgument, isCommaToken));

		const textAfter = sourceCode.text.slice(end);
		const [leadingSpaces] = textAfter.match(/^\s*/v);
		end += leadingSpaces.length;

		return fixer.removeRange([start, end]);
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (
			!arrayIsArrayLiteral
			&& needsSemicolon(sourceCode.getTokenBefore(node), context, '[')
		) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield (
			concatCallArguments.length === fixableArguments.length
				? removeMethodCall(fixer, node, context)
				: removeArguments(fixer)
		);

		const text = getFixedText();

		if (arrayIsArrayLiteral) {
			const closingBracketToken = sourceCode.getLastToken(array);
			yield fixer.insertTextBefore(closingBracketToken, text);
		} else {
			// The array is already accessing `.concat`, there should be no case where extra `()` are needed.
			yield fixer.insertTextBeforeRange(arrayParenthesizedRange, '[...');
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, text);
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, ']');
		}
	};
}

const getConcatArgumentSpreadable = (node, scope, context) => {
	if (node.type === 'SpreadElement') {
		return;
	}

	if (isArrayConstructorWithOneArgument(node, context)) {
		return;
	}

	if (isArrayLiteral(node)) {
		return {node, isArrayLiteral: true};
	}

	const result = getStaticValue(node, scope);

	if (!result) {
		return;
	}

	const isSpreadable = Array.isArray(result.value);

	return {node, isSpreadable};
};

function getConcatFixableArguments(argumentsList, scope, context) {
	const fixableArguments = [];

	for (const node of argumentsList) {
		const result = getConcatArgumentSpreadable(node, scope, context);

		if (result) {
			fixableArguments.push(result);
		} else {
			break;
		}
	}

	return fixableArguments;
}

function fixArrayFrom(node, context) {
	const {sourceCode} = context;
	const [object] = node.arguments;

	function getObjectText() {
		if (isArrayLiteral(object)) {
			return sourceCode.getText(object);
		}

		const [start, end] = getParenthesizedRange(object, context);
		const text = sourceCode.text.slice(start, end);

		return `[...${text}]`;
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		const objectText = getObjectText();

		yield fixer.replaceText(node, objectText);
	};
}

function methodCallToSpread(node, context) {
	return function * (fixer) {
		const {sourceCode} = context;
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield fixer.insertTextBefore(node, '[...');
		yield fixer.insertTextAfter(node, ']');

		// The receiver is already accessing `.slice` or `.toSpliced`, there should be no case where extra `()` are needed.

		yield removeMethodCall(fixer, node, context);
	};
}

function isClassName(node) {
	if (node.type === 'MemberExpression') {
		node = node.property;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const {name} = node;

	return /^[A-Z]./v.test(name) && name.toUpperCase() !== name;
}

const isGlobalIdentifier = (node, name, context) =>
	node.type === 'Identifier'
	&& node.name === name
	&& context.sourceCode.isGlobalReference(node);

function isGlobalMemberExpression(node, objectName, propertyName, context) {
	if (
		node.type !== 'MemberExpression'
		|| !isGlobalIdentifier(node.object, objectName, context)
	) {
		return false;
	}

	if (!node.computed) {
		return node.property.type === 'Identifier' && node.property.name === propertyName;
	}

	const staticValue = getStaticValue(node.property, context.sourceCode.getScope(node.property));
	return staticValue?.value === propertyName;
}

const resolveIdentifierName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
};

const isDefaultLibrarySymbol = (symbol, program) =>
	symbol?.declarations?.some(declaration => program.isSourceFileDefaultLibrary(declaration.getSourceFile())) ?? false;

function isBufferModuleImport(definition) {
	return (
		definition?.type === 'ImportBinding'
		&& (
			definition.parent?.source?.value === 'node:buffer'
			|| definition.parent?.source?.value === 'buffer'
		)
	);
}

function getIdentifierDefinition(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const [definition] = variable?.defs ?? [];
	return definition;
}

function isKnownBufferReference(node, context) {
	if (node.name === 'Buffer' && context.sourceCode.isGlobalReference(node)) {
		return true;
	}

	if (
		node.type === 'MemberExpression'
		&& !node.computed
		&& node.property.type === 'Identifier'
		&& node.property.name === 'Buffer'
	) {
		if (
			isGlobalIdentifier(node.object, 'global', context)
			|| isGlobalIdentifier(node.object, 'globalThis', context)
		) {
			return true;
		}

		const definition = getIdentifierDefinition(node.object, context);
		return isBufferModuleImport(definition) && definition.node.type === 'ImportNamespaceSpecifier';
	}

	const definition = getIdentifierDefinition(node, context);

	return (
		isBufferModuleImport(definition)
		&& definition.node.type === 'ImportSpecifier'
		&& definition.node.imported.type === 'Identifier'
		&& definition.node.imported.name === 'Buffer'
	);
}

function getTypeReferenceDefinitionState(typeName, scope, visitedTypeNames) {
	const variable = resolveIdentifierName(typeName, scope);
	const [definition] = variable?.defs ?? [];

	if (!definition) {
		return knownNonArrayTypeNames.has(typeName) ? false : undefined;
	}

	if (definition.type === 'ClassName') {
		return false;
	}

	if (definition.type === 'ImportBinding') {
		const importedName = definition.node.type === 'ImportSpecifier' && definition.node.imported.type === 'Identifier'
			? definition.node.imported.name
			: typeName;

		return knownNonArrayTypeNames.has(importedName) ? false : undefined;
	}

	if (definition.type !== 'Type') {
		return;
	}

	if (definition.node.type === 'TSTypeAliasDeclaration') {
		return getTypeAnnotationArrayState(definition.node.typeAnnotation, scope, visitedTypeNames);
	}

	if (definition.node.type === 'TSTypeParameter') {
		return definition.node.constraint
			? getTypeAnnotationArrayState(definition.node.constraint, scope, visitedTypeNames)
			: undefined;
	}

	if (definition.node.type === 'TSInterfaceDeclaration') {
		return false;
	}
}

const getUnionArrayState = states => {
	if (states.includes(undefined)) {
		return undefined;
	}

	if (states.every(Boolean)) {
		return true;
	}

	return states.some(Boolean) ? undefined : false;
};

const getIntersectionArrayState = states => {
	if (states.some(Boolean)) {
		return true;
	}

	return states.includes(undefined) ? undefined : false;
};

const isTypeParameterType = type =>
	type.isTypeParameter?.()
	|| (type.flags % (typeParameterTypeFlag * 2) >= typeParameterTypeFlag);

function getTypeNameIdentifierName(node) {
	return node.type === 'TSQualifiedName'
		? getTypeNameIdentifierName(node.right)
		: node.name;
}

function getTypeNameNamespaceIdentifierName(node) {
	return node.type === 'TSQualifiedName'
		? getTypeNameNamespaceIdentifierName(node.left)
		: node.name;
}

function getTypeReferenceArrayState(node, scope, visitedTypeNames) {
	if (node.typeName.type === 'TSQualifiedName') {
		if (
			knownNonArrayTypeNames.has(getTypeNameIdentifierName(node.typeName))
		) {
			const namespace = resolveIdentifierName(getTypeNameNamespaceIdentifierName(node.typeName), scope);
			const [definition] = namespace?.defs ?? [];

			return definition?.type === 'ImportBinding' && definition.node.type === 'ImportNamespaceSpecifier'
				? false
				: undefined;
		}

		return;
	}

	if (node.typeName.type !== 'Identifier') {
		return;
	}

	const {name} = node.typeName;

	if (arrayTypeNames.has(name)) {
		return true;
	}

	if (visitedTypeNames.has(name)) {
		return undefined;
	}

	visitedTypeNames.add(name);
	const state = getTypeReferenceDefinitionState(name, scope, visitedTypeNames);
	visitedTypeNames.delete(name);

	return state;
}

function getTypeAnnotationArrayState(node, scope, visitedTypeNames = new Set()) {
	if (!node || unknownTypeAnnotationTypes.has(node.type)) {
		return undefined;
	}

	if (transparentTypeAnnotationTypes.has(node.type)) {
		return getTypeAnnotationArrayState(node.typeAnnotation, scope, visitedTypeNames);
	}

	if (arrayTypeAnnotationTypes.has(node.type)) {
		return true;
	}

	if (node.type === 'TSTypeOperator') {
		return node.operator === 'readonly'
			? getTypeAnnotationArrayState(node.typeAnnotation, scope, visitedTypeNames)
			: false;
	}

	if (node.type === 'TSTypeReference') {
		return getTypeReferenceArrayState(node, scope, visitedTypeNames);
	}

	if (
		node.type === 'TSImportType'
		&& node.qualifier
		&& knownNonArrayTypeNames.has(getTypeNameIdentifierName(node.qualifier))
	) {
		return false;
	}

	if (node.type === 'TSUnionType') {
		return getUnionArrayState(node.types.map(type => getTypeAnnotationArrayState(type, scope, visitedTypeNames)));
	}

	if (node.type === 'TSIntersectionType') {
		return getIntersectionArrayState(node.types.map(type => getTypeAnnotationArrayState(type, scope, visitedTypeNames)));
	}

	if (nonArrayTypeAnnotationTypes.has(node.type)) {
		return false;
	}

	return undefined;
}

function getIdentifierAnnotationArrayState(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);

	for (const definition of variable?.defs ?? []) {
		const state = getTypeAnnotationArrayState(definition.name?.typeAnnotation, context.sourceCode.getScope(node));

		if (state !== undefined) {
			return state;
		}
	}
}

function getReceiverAnnotationArrayState(node, context) {
	switch (node.type) {
		case 'TSAsExpression':
		case 'TSTypeAssertion':
		case 'TSSatisfiesExpression': {
			const state = getTypeAnnotationArrayState(node.typeAnnotation, context.sourceCode.getScope(node));
			return state ?? getReceiverAnnotationArrayState(node.expression, context);
		}

		case 'TSNonNullExpression':
		case 'ChainExpression':
		case 'ParenthesizedExpression': {
			return getReceiverAnnotationArrayState(node.expression, context);
		}

		case 'Identifier': {
			return getIdentifierAnnotationArrayState(node, context);
		}

		default: {
			return undefined;
		}
	}
}

function getTypeArrayState(type, checker, program) {
	if (unknownTypeNames.has(type.intrinsicName)) {
		return;
	}

	if (type.isUnion()) {
		const states = type.types.map(type => getTypeArrayState(type, checker, program));

		if (states.includes(undefined)) {
			return;
		}

		if (states.every(Boolean)) {
			return true;
		}

		return states.some(Boolean) ? undefined : false;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getTypeArrayState(constraint, checker, program);
	}

	if (isTypeParameterType(type)) {
		return;
	}

	if (type.isIntersection()) {
		const states = type.types.map(type => getTypeArrayState(type, checker, program));

		if (states.some(Boolean)) {
			return true;
		}

		return states.includes(undefined) ? undefined : false;
	}

	if (checker.isArrayType(type) || checker.isTupleType(type)) {
		return true;
	}

	const symbol = type.getSymbol() ?? type.aliasSymbol;
	if (
		isDefaultLibrarySymbol(symbol, program)
		&& arrayTypeNames.has(symbol.getName())
	) {
		return true;
	}

	return false;
}

function getTypeInformationArrayState(node, context) {
	const {parserServices} = context.sourceCode;

	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		return getTypeArrayState(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {
		return undefined;
	}
}

function isKnownNonArrayCall(node, context) {
	if (
		isMethodCall(node, {
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})
		&& isKnownBufferReference(node.callee.object, context)
	) {
		return true;
	}

	if (
		node.type !== 'CallExpression'
		|| node.callee.type !== 'Identifier'
		|| !nonArrayFactoryNames.has(node.callee.name)
	) {
		return false;
	}

	return context.sourceCode.isGlobalReference(node.callee);
}

function isKnownNonArrayConstruction(node, context) {
	if (
		node.type !== 'NewExpression'
		|| node.callee.type !== 'Identifier'
	) {
		return false;
	}

	return !isGlobalIdentifier(node.callee, 'Array', context);
}

function isGlobalArrayReference(node, context) {
	return (
		isGlobalIdentifier(node, 'Array', context)
		|| isGlobalMemberExpression(node, 'global', 'Array', context)
		|| isGlobalMemberExpression(node, 'globalThis', 'Array', context)
	);
}

function isArrayConstructorCall(node, context) {
	node = unwrapReceiverReference(node);

	return (
		(
			node.type === 'CallExpression'
			|| node.type === 'NewExpression'
		)
		&& isGlobalArrayReference(node.callee, context)
	);
}

function isArrayConstructorWithOneArgument(node, context) {
	node = unwrapReceiverReference(node);

	return (
		(
			node.type === 'CallExpression'
			|| node.type === 'NewExpression'
		)
		&& node.arguments.length === 1
		&& isGlobalArrayReference(node.callee, context)
	);
}

function unwrapReceiverReference(node) {
	if (
		node.type === 'ChainExpression'
		|| node.type === 'ParenthesizedExpression'
		|| node.type === 'TSAsExpression'
		|| node.type === 'TSTypeAssertion'
		|| node.type === 'TSSatisfiesExpression'
		|| node.type === 'TSNonNullExpression'
	) {
		return unwrapReceiverReference(node.expression);
	}

	return node;
}

function isSameReceiverReference(left, right, context) {
	left = unwrapReceiverReference(left);
	right = unwrapReceiverReference(right);

	if (!isSameReference(left, right)) {
		return false;
	}

	if (left.type === 'Identifier' && right.type === 'Identifier') {
		return findVariable(context.sourceCode.getScope(left), left) === findVariable(context.sourceCode.getScope(right), right);
	}

	if (left.type === 'MemberExpression' && right.type === 'MemberExpression') {
		return (
			isSameReceiverReference(left.object, right.object, context)
			&& (
				!left.computed
				|| !right.computed
				|| isSameReceiverReference(left.property, right.property, context)
			)
		);
	}

	return true;
}

function getMemberExpressionPropertyName(node, context) {
	if (!node.computed && node.property.type === 'Identifier') {
		return node.property.name;
	}

	const staticValue = getStaticValue(node.property, context.sourceCode.getScope(node.property));
	if (staticValue) {
		return String(staticValue.value);
	}
}

function isWriteTargetAffectingReference(writeTarget, referenceNode, context) {
	writeTarget = unwrapReceiverReference(writeTarget);
	referenceNode = unwrapReceiverReference(referenceNode);

	if (isSameReceiverReference(writeTarget, referenceNode, context)) {
		return true;
	}

	if (
		writeTarget.type === 'MemberExpression'
		&& referenceNode.type === 'MemberExpression'
		&& isSameReceiverReference(writeTarget.object, referenceNode.object, context)
	) {
		const writePropertyName = getMemberExpressionPropertyName(writeTarget, context);
		const referencePropertyName = getMemberExpressionPropertyName(referenceNode, context);

		return (
			writePropertyName === undefined
			|| referencePropertyName === undefined
			|| writePropertyName === referencePropertyName
		);
	}

	if (referenceNode.type === 'MemberExpression') {
		return isWriteTargetAffectingReference(writeTarget, referenceNode.object, context);
	}

	if (
		writeTarget.type === 'ArrayPattern'
		|| writeTarget.type === 'ObjectPattern'
	) {
		return writeTarget.elements?.some(element => element && isWriteTargetAffectingReference(element, referenceNode, context))
			|| writeTarget.properties?.some(property => isWriteTargetAffectingReference(property, referenceNode, context));
	}

	if (writeTarget.type === 'Property') {
		return isWriteTargetAffectingReference(writeTarget.value, referenceNode, context);
	}

	if (
		writeTarget.type === 'AssignmentPattern'
		|| writeTarget.type === 'RestElement'
	) {
		return isWriteTargetAffectingReference(writeTarget.left ?? writeTarget.argument, referenceNode, context);
	}

	return false;
}

function hasWriteToReferenceBeforeNode(referenceNode, startNode, endNode, context) {
	const {sourceCode} = context;
	const [start] = sourceCode.getRange(startNode);
	const [end] = sourceCode.getRange(endNode);

	const visit = node => {
		if (!node || typeof node.type !== 'string') {
			return false;
		}

		const [nodeStart, nodeEnd] = sourceCode.getRange(node);
		if (nodeEnd <= start || nodeStart >= end) {
			return false;
		}

		if (isFunction(node)) {
			return false;
		}

		if (
			(
				node.type === 'AssignmentExpression'
				&& isWriteTargetAffectingReference(node.left, referenceNode, context)
				&& !isDescendantOf(referenceNode, node.right)
			)
			|| (
				node.type === 'VariableDeclarator'
				&& node.init
				&& isWriteTargetAffectingReference(node.id, referenceNode, context)
			)
			|| (node.type === 'UpdateExpression' && isWriteTargetAffectingReference(node.argument, referenceNode, context))
		) {
			return true;
		}

		for (const value of Object.values(node)) {
			if (value === node.parent) {
				continue;
			}

			if (Array.isArray(value)) {
				if (value.some(child => visit(child))) {
					return true;
				}
			} else if (visit(value)) {
				return true;
			}
		}

		return false;
	};

	return visit(startNode);
}

const isArrayIsArrayCallWithArgument = (node, argument, context) =>
	isMethodCall(node, {
		object: 'Array',
		method: 'isArray',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isGlobalIdentifier(node.callee.object, 'Array', context)
	&& isSameReceiverReference(node.arguments[0], argument, context);

function getArrayIsArrayTestState(node, argument, context) {
	if (isArrayIsArrayCallWithArgument(node, argument, context)) {
		return true;
	}

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
		&& isArrayIsArrayCallWithArgument(node.argument, argument, context)
	) {
		return false;
	}
}

function isDescendantOf(node, ancestor) {
	while (node) {
		if (node === ancestor) {
			return true;
		}

		node = node.parent;
	}

	return false;
}

function isNotArrayByArrayIsArrayTest(node, context) {
	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (isFunction(ancestor)) {
			break;
		}

		if (ancestor.type !== 'IfStatement') {
			continue;
		}

		const arrayState = getArrayIsArrayTestState(ancestor.test, node, context);
		const nonArrayBranch = arrayState === false
			? ancestor.consequent
			: ancestor.alternate;

		if (!nonArrayBranch || !isDescendantOf(node, nonArrayBranch)) {
			continue;
		}

		if (hasWriteToReferenceBeforeNode(node, nonArrayBranch, node, context)) {
			continue;
		}

		if (arrayState !== undefined) {
			return true;
		}
	}

	return false;
}

function isNotArray(node, scope) {
	if (
		node.type === 'TemplateLiteral'
		|| node.type === 'Literal'
		|| node.type === 'BinaryExpression'
		|| isClassName(node)
		// `foo.join(…)`
		|| isMethodNamed(node, 'join')
	) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (staticValue && !Array.isArray(staticValue.value)) {
		return true;
	}

	return false;
}

function isNotArrayConcatReceiver(node, context) {
	const unwrappedNode = unwrapReceiverReference(node);
	const annotationState = getReceiverAnnotationArrayState(node, context);
	const typeState = getTypeInformationArrayState(node, context);

	if (typeState === false) {
		return true;
	}

	if (typeState === true) {
		return false;
	}

	if (annotationState === false) {
		return true;
	}

	if (annotationState === true) {
		return false;
	}

	const scope = context.sourceCode.getScope(unwrappedNode);
	if (isNotArray(unwrappedNode, scope)) {
		return true;
	}

	if (
		unwrappedNode.type === 'ObjectExpression'
		|| unwrappedNode.type === 'FunctionExpression'
		|| unwrappedNode.type === 'ArrowFunctionExpression'
		|| unwrappedNode.type === 'ClassExpression'
		|| isKnownNonArrayCall(unwrappedNode, context)
		|| isKnownNonArrayConstruction(unwrappedNode, context)
		|| isNotArrayByArrayIsArrayTest(unwrappedNode, context)
	) {
		return true;
	}

	return false;
}

function isKnownArrayConcatReceiver(node, context) {
	const unwrappedNode = unwrapReceiverReference(node);

	return (
		isArrayLiteral(unwrappedNode)
		|| isArrayConstructorCall(unwrappedNode, context)
		|| getTypeInformationArrayState(node, context) === true
		|| getReceiverAnnotationArrayState(node, context) === true
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Any inner comment outside preserved ranges means the autofix would relocate or drop comments.
	const hasCommentsOutsideRanges = (node, preservedRanges) => sourceCode.getCommentsInside(node).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return !preservedRanges.some(([start, end]) => commentStart >= start && commentEnd <= end);
	});

	const hasExtraComments = (node, preservedNodeOrRange) => {
		const preservedRange = Array.isArray(preservedNodeOrRange)
			? preservedNodeOrRange
			: getParenthesizedRange(preservedNodeOrRange, context);

		return hasCommentsOutsideRanges(node, [preservedRange]);
	};

	// Collect ranges whose comments are guaranteed to survive the concat-to-spread fix.
	const getConcatPreservedRanges = (node, fixedArgumentsCount) => {
		const fixedArguments = node.arguments.slice(0, fixedArgumentsCount);
		// Needed to decide whether a trailing comma comment can still stay in place.
		const lastNonEmptyFixedArgument = fixedArguments.findLast(argument =>
			!isArrayLiteral(argument)
			|| !isEmptyArrayExpression(argument));
		const preservedRanges = [
			getParenthesizedRange(node.callee.object, context),
			...fixedArguments.flatMap(argument => {
				if (isArrayLiteral(argument)) {
					if (isEmptyArrayExpression(argument)) {
						return [];
					}

					if (isArrayLiteralOuterCommentsPreservable(argument, context)) {
						return [getParenthesizedRange(argument, context)];
					}

					const arrayRange = sourceCode.getRange(argument);

					if (
						isArrayLiteralHasTrailingComma(argument, sourceCode)
						&& argument !== lastNonEmptyFixedArgument
					) {
						const [trailingCommaStart] = sourceCode.getRange(sourceCode.getLastToken(argument, 1));

						// Preserve comments after the last element but before trailing comma,
						// since the comma itself disappears when this argument is flattened.
						return [[arrayRange[0] + 1, trailingCommaStart]];
					}

					if (hasArrayHoles(argument)) {
						// Hole positions must stay stable, so preserve the full literal range.
						return [arrayRange];
					}
				}

				return [getParenthesizedRange(argument, context)];
			}),
		];

		if (fixedArgumentsCount < node.arguments.length) {
			// Comments between `.concat(` and the first fixed argument can be moved to the
			// remaining arguments by the partial fix, so they are intentionally not preserved.
			const lastFixedArgument = fixedArguments.at(-1);
			const commaToken = sourceCode.getTokenAfter(lastFixedArgument, isCommaToken);
			const [, start] = sourceCode.getRange(commaToken);
			const [, end] = sourceCode.getRange(node);
			preservedRanges.push([start, end]);
		}

		return preservedRanges;
	};

	// `Array.from()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				object: 'Array',
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			// Allow `Array.from({length})`
			&& node.arguments[0].type !== 'ObjectExpression'
			&& !isPreferIteratorConcatArrayLiteral(node.arguments[0])
		)) {
			return;
		}

		const [firstArgument] = node.arguments;
		const preservedRange = isArrayLiteral(firstArgument)
			? sourceCode.getRange(firstArgument)
			: getParenthesizedRange(firstArgument, context);

		return {
			node,
			messageId: ERROR_ARRAY_FROM,
			...(!hasExtraComments(node, preservedRange) && {fix: fixArrayFrom(node, context)}),
		};
	});

	// `array.concat()`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {object} = node.callee;
		const scope = sourceCode.getScope(object);

		if (isNotArrayConcatReceiver(object, context)) {
			return;
		}

		if (
			!isKnownArrayConcatReceiver(object, context)
			&& node.arguments.length > 0
			&& node.arguments.every(argument => isStaticString(argument, scope))
		) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: ERROR_ARRAY_CONCAT,
		};

		const fixableArguments = getConcatFixableArguments(node.arguments, scope, context);
		const receiverSafeToSpread = !isArrayConstructorWithOneArgument(object, context);

		if (fixableArguments.length > 0 || node.arguments.length === 0) {
			if (
				receiverSafeToSpread
				&& !hasCommentsOutsideRanges(node, getConcatPreservedRanges(node, fixableArguments.length))
			) {
				problem.fix = fixConcat(node, context, fixableArguments);
			}

			return problem;
		}

		const [firstArgument, ...restArguments] = node.arguments;
		if (firstArgument.type === 'SpreadElement') {
			return problem;
		}

		if (!receiverSafeToSpread) {
			return problem;
		}

		if (isArrayConstructorWithOneArgument(firstArgument, context)) {
			return problem;
		}

		const fixableArgumentsAfterFirstArgument = getConcatFixableArguments(restArguments, scope, context);
		const hasUnsafeArrayConstructorRestArgument = restArguments.some(argument => isArrayConstructorWithOneArgument(argument, context));
		const suggestions = [
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE,
				isSpreadable: true,
			},
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE,
				isSpreadable: false,
			},
		];

		if (!hasSideEffect(firstArgument, sourceCode)) {
			suggestions.push({
				messageId: SUGGESTION_CONCAT_TEST_ARGUMENT,
				testArgument: true,
			});
		}

		problem.suggest = suggestions.map(({messageId, isSpreadable, testArgument}) => ({
			messageId,
			fix: fixConcat(
				node,
				context,
				// When apply suggestion, we also merge fixable arguments after the first one
				[
					{
						node: firstArgument,
						isSpreadable,
						testArgument,
					},
					...fixableArgumentsAfterFirstArgument,
				],
			),
		}));

		if (
			!hasUnsafeArrayConstructorRestArgument
			&& fixableArgumentsAfterFirstArgument.length < restArguments.length
			&& restArguments.every(({type}) => type !== 'SpreadElement')
		) {
			problem.suggest.push({
				messageId: SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS,
				fix: fixConcat(
					node,
					context,
					node.arguments.map(node => getConcatArgumentSpreadable(node, scope, context) || {node, isSpreadable: true}),
				),
			});
		}

		return problem;
	});

	// `array.slice()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'slice',
				minimumArguments: 0,
				maximumArguments: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& !isArrayLiteral(node.callee.object)
			&& !hasOptionalChainElement(node.callee.object)
		)) {
			return;
		}

		if (isNodeMatches(node.callee.object, ignoredSliceCallee)) {
			return;
		}

		const scope = sourceCode.getScope(node.callee.object);
		if (isNotArray(node.callee.object, scope)) {
			return;
		}

		// Skip TypedArray/ArrayBuffer constructions - spreading them either fails
		// (ArrayBuffer has no iterator) or changes the type (TypedArray -> number[])
		if (isTypedArrayConstruction(node.callee.object)) {
			return;
		}

		const [firstArgument] = node.arguments;
		if (firstArgument && !isLiteral(firstArgument, 0)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_SLICE,
			...(!hasExtraComments(node, node.callee.object) && {fix: methodCallToSpread(node, context)}),
		};
	});

	// `array.toSpliced()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'toSpliced',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.callee.object.type !== 'ArrayExpression'
		)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_TO_SPLICED,
			...(!hasExtraComments(node, node.callee.object) && {fix: methodCallToSpread(node, context)}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, and `Array#{slice,toSpliced}()`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
