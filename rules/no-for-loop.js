import {getStaticValue, isClosingParenToken} from '@eslint-community/eslint-utils';
import {
	getAvailableVariableName,
	getConstVariableInitializer,
	getScopes,
	getVariableByName,
	singular,
	toLocation,
	getReferences,
	getStaticValueIfNoSideEffects,
	isBoolean,
	isNumber,
	isArray,
	isNullishType,
	isUnknownType,
	hasPotentiallyMutableMemberAccess,
	hasCommentInRange,
	getParenthesizedRange,
} from './utils/index.js';
import {
	isCallExpression,
	isLiteral,
} from './ast/index.js';

const MESSAGE_ID = 'no-for-loop';
const messages = {
	[MESSAGE_ID]: 'Use a `for-of` loop instead of this `for` loop.',
};

const defaultElementName = 'element';
const entriesSupported = 'supported';
const entriesUnsupported = 'unsupported';
const entriesUnknown = 'unknown';
const noEntriesTypeNames = new Set([
	'HTMLAllCollection',
	'HTMLCollection',
	'HTMLCollectionOf',
	'HTMLFormControlsCollection',
	'HTMLFormElement',
	'HTMLOptionsCollection',
	'HTMLSelectElement',
	'String',
]);
// These return an `HTMLCollection`, which has no `.entries()`. A `NodeList` (`querySelectorAll()`, `getElementsByName()`) has one.
const noEntriesDomCollectionMethods = new Set([
	'getElementsByClassName',
	'getElementsByTagName',
	'getElementsByTagNameNS',
]);
const noEntriesTypeAnnotationTypes = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSVoidKeyword',
	'TSLiteralType',
]);
const isLiteralZero = node => isLiteral(node, 0);
const isLiteralOne = node => isLiteral(node, 1);

const isIdentifierWithName = (node, name) => node?.type === 'Identifier' && node.name === name;

const getArrayIdentifierFromLengthMemberExpression = node => {
	if (
		node?.type !== 'MemberExpression'
		|| node.computed
		|| node.object.type !== 'Identifier'
		|| node.property.type !== 'Identifier'
		|| node.property.name !== 'length'
	) {
		return;
	}

	return node.object;
};

const combineUnionEntriesSupport = entriesSupports => {
	if (entriesSupports.every(entriesSupport => entriesSupport === entriesSupported)) {
		return entriesSupported;
	}

	return entriesSupports.includes(entriesUnsupported) ? entriesUnsupported : entriesUnknown;
};

const combineIntersectionEntriesSupport = entriesSupports => {
	if (entriesSupports.includes(entriesSupported)) {
		return entriesSupported;
	}

	return entriesSupports.every(entriesSupport => entriesSupport === entriesUnsupported) ? entriesUnsupported : entriesUnknown;
};

const getTypeReferenceEntriesSupport = (node, scope, visitedTypeVariables) => {
	// A qualified name like `Foo.Bar` cannot be resolved by name
	if (node.typeName.type !== 'Identifier') {
		return entriesUnknown;
	}

	const typeReferenceName = node.typeName.name;

	if (typeReferenceName === 'Array' || typeReferenceName === 'ReadonlyArray') {
		return entriesSupported;
	}

	if (noEntriesTypeNames.has(typeReferenceName)) {
		return entriesUnsupported;
	}

	const typeVariable = scope && getVariableByName(typeReferenceName, scope);
	if (visitedTypeVariables.has(typeVariable)) {
		return entriesUnknown;
	}

	visitedTypeVariables.add(typeVariable);
	const [definition] = typeVariable?.defs ?? [];

	if (!definition || definition.type !== 'Type') {
		visitedTypeVariables.delete(typeVariable);
		return entriesUnknown;
	}

	let entriesSupport = entriesUnknown;

	if (definition.node.type === 'TSTypeAliasDeclaration') {
		entriesSupport = getTypeAnnotationEntriesSupport(definition.node.typeAnnotation, typeVariable.scope, visitedTypeVariables);
	} else if (definition.node.type === 'TSTypeParameter') {
		entriesSupport = getTypeAnnotationEntriesSupport(definition.node.constraint, typeVariable.scope, visitedTypeVariables);
	}

	visitedTypeVariables.delete(typeVariable);

	return entriesSupport;
};

const getTypeAnnotationEntriesSupport = (node, scope, visitedTypeVariables = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationEntriesSupport(node.typeAnnotation, scope, visitedTypeVariables);
		}

		case 'TSArrayType':
		case 'TSTupleType': {
			return entriesSupported;
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationEntriesSupport(node.typeAnnotation, scope, visitedTypeVariables)
				: entriesUnknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceEntriesSupport(node, scope, visitedTypeVariables);
		}

		case 'TSUnionType': {
			return combineUnionEntriesSupport(node.types.map(type => getTypeAnnotationEntriesSupport(type, scope, visitedTypeVariables)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionEntriesSupport(node.types.map(type => getTypeAnnotationEntriesSupport(type, scope, visitedTypeVariables)));
		}

		default: {
			return noEntriesTypeAnnotationTypes.has(node?.type) ? entriesUnsupported : entriesUnknown;
		}
	}
};

const getEntryTypeSupport = (type, checker) => {
	if (!type || isUnknownType(type)) {
		return entriesUnknown;
	}

	if (type.isUnion()) {
		const types = type.types.filter(type => !isNullishType(type));
		return types.length === 0
			? entriesUnknown
			: combineUnionEntriesSupport(types.map(type => getEntryTypeSupport(type, checker)));
	}

	return checker.isArrayType(type) || checker.isTupleType(type)
		? entriesSupported
		: entriesUnsupported;
};

// Only called for an iterator type, which has a callable `next()`
const getIteratorResultValueType = (type, checker) => {
	const [nextSignature] = checker.getTypeOfPropertyOfType(type, 'next').getCallSignatures();
	return checker.getTypeOfPropertyOfType(checker.getReturnTypeOfSignature(nextSignature), 'value');
};

const getEntriesReturnSupport = (type, checker) => {
	if (isUnknownType(type)) {
		return entriesUnknown;
	}

	if (type.isUnion()) {
		return combineUnionEntriesSupport(type.types.map(type => getEntriesReturnSupport(type, checker)));
	}

	const isArrayReturn = checker.isArrayType(type);
	const next = checker.getTypeOfPropertyOfType(type, 'next');
	const hasCallableNext = next?.getCallSignatures().length > 0;

	if (!isArrayReturn && !hasCallableNext) {
		return entriesUnsupported;
	}

	const [entryType] = checker.getTypeArguments(type);
	return getEntryTypeSupport(entryType ?? getIteratorResultValueType(type, checker), checker);
};

const getCallableEntriesSupport = (type, checker) => {
	const entriesSupports = (type?.getCallSignatures() ?? [])
		.filter(signature => signature.parameters.length === 0)
		.map(signature => getEntriesReturnSupport(checker.getReturnTypeOfSignature(signature), checker));

	return entriesSupports.length === 0
		? entriesUnsupported
		: combineIntersectionEntriesSupport(entriesSupports);
};

const getTypeEntriesSupport = (type, checker) => {
	if (isUnknownType(type)) {
		return entriesUnknown;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();
		return constraint ? getTypeEntriesSupport(constraint, checker) : entriesUnknown;
	}

	if (type.isUnion()) {
		return combineUnionEntriesSupport(type.types.map(type => getTypeEntriesSupport(type, checker)));
	}

	if (type.isIntersection()) {
		return combineIntersectionEntriesSupport(type.types.map(type => getTypeEntriesSupport(type, checker)));
	}

	if (checker.isArrayType(type) || checker.isTupleType(type)) {
		return entriesSupported;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getTypeEntriesSupport(constraint, checker);
	}

	const entries = checker.getTypeOfPropertyOfType(type, 'entries');
	return getCallableEntriesSupport(entries, checker);
};

const getEntriesSupportFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return entriesUnknown;
	}

	try {
		return getTypeEntriesSupport(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
		// Defensive: the TypeScript type checker can throw on unusual types, the rule then falls back to syntax
		/* node:coverage ignore next 3 */
	} catch {
		return entriesUnknown;
	}
};

const isNoEntriesDomCollection = (node, context) =>
	isCallExpression(node, {
		optional: false,
	})
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.computed
	&& node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'document'
	&& context.sourceCode.isGlobalReference(node.callee.object)
	&& node.callee.property.type === 'Identifier'
	&& noEntriesDomCollectionMethods.has(node.callee.property.name);

const getEntriesSupportFromVariable = (node, context, visitedVariables) => {
	const variable = getVariableByName(node.name, context.sourceCode.getScope(node));

	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return entriesUnknown;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const definitionScope = context.sourceCode.getScope(definition.name);
	const entriesSupportFromAnnotation = getTypeAnnotationEntriesSupport(definition.name.typeAnnotation, definitionScope);
	let entriesSupport = entriesSupportFromAnnotation;

	// The declaration kind does not matter, a known no-entries collection has no `.entries()`
	if (
		entriesSupport === entriesUnknown
		&& definition.type === 'Variable'
		&& definition.node.id === definition.name
		&& definition.node.init
	) {
		entriesSupport = getEntriesSupport(definition.node.init, context, visitedVariables);
	}

	visitedVariables.delete(variable);

	return entriesSupport;
};

function getEntriesSupportFromSyntax(node, context, visitedVariables) {
	switch (node.type) {
		case 'Identifier': {
			return getEntriesSupportFromVariable(node, context, visitedVariables);
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion': {
			const entriesSupportFromAnnotation = getTypeAnnotationEntriesSupport(node.typeAnnotation, context.sourceCode.getScope(node));
			return entriesSupportFromAnnotation === entriesUnknown
				? getEntriesSupport(node.expression, context, visitedVariables)
				: entriesSupportFromAnnotation;
		}

		case 'TSSatisfiesExpression':
		case 'TSNonNullExpression': {
			return getEntriesSupport(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getEntriesSupport(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineUnionEntriesSupport([
				getEntriesSupport(node.consequent, context, visitedVariables),
				getEntriesSupport(node.alternate, context, visitedVariables),
			]);
		}

		default: {
			return isNoEntriesDomCollection(node, context) ? entriesUnsupported : entriesUnknown;
		}
	}
}

function getEntriesSupport(node, context, visitedVariables = new Set()) {
	if (isArray(node, context)) {
		return entriesSupported;
	}

	const entriesSupportFromTypeInformation = getEntriesSupportFromTypeInformation(node, context);
	return entriesSupportFromTypeInformation === entriesUnknown ? getEntriesSupportFromSyntax(node, context, visitedVariables) : entriesSupportFromTypeInformation;
}

const getLoopInfoFromSingleDeclarator = forStatement => {
	const {init: variableDeclaration} = forStatement;

	if (
		!variableDeclaration
		|| variableDeclaration.type !== 'VariableDeclaration'
		|| variableDeclaration.declarations.length !== 1
	) {
		return;
	}

	const [variableDeclarator] = variableDeclaration.declarations;
	const {id, init} = variableDeclarator;

	if (
		id.type !== 'Identifier'
		|| !isLiteralZero(init)
	) {
		return;
	}

	const arrayIdentifier = getArrayIdentifierFromBinaryExpression(forStatement.test, id.name);

	if (!arrayIdentifier) {
		return;
	}

	return {
		arrayIdentifier,
		indexIdentifierName: id.name,
	};
};

const getStrictComparisonOperands = binaryExpression => {
	if (binaryExpression.operator === '<') {
		return {
			lesser: binaryExpression.left,
			greater: binaryExpression.right,
		};
	}

	if (binaryExpression.operator === '>') {
		return {
			lesser: binaryExpression.right,
			greater: binaryExpression.left,
		};
	}
};

const getArrayIdentifierFromBinaryExpression = (binaryExpression, indexIdentifierName) => {
	if (binaryExpression?.type !== 'BinaryExpression') {
		return;
	}

	const operands = getStrictComparisonOperands(binaryExpression);

	if (!operands) {
		return;
	}

	const {lesser, greater} = operands;

	if (!isIdentifierWithName(lesser, indexIdentifierName)) {
		return;
	}

	return getArrayIdentifierFromLengthMemberExpression(greater);
};

const getLoopInfoFromCachedLengthDeclarator = forStatement => {
	const {init: variableDeclaration, test} = forStatement;

	if (
		!variableDeclaration
		|| variableDeclaration.type !== 'VariableDeclaration'
		|| variableDeclaration.declarations.length !== 2
		|| test?.type !== 'BinaryExpression'
	) {
		return;
	}

	const [indexDeclarator, cachedLengthDeclarator] = variableDeclaration.declarations;
	const {id: indexIdentifier, init: indexInitializer} = indexDeclarator;
	const {id: cachedLengthIdentifier, init: cachedLengthInitializer} = cachedLengthDeclarator;

	if (
		indexIdentifier.type !== 'Identifier'
		|| !isLiteralZero(indexInitializer)
		|| cachedLengthIdentifier.type !== 'Identifier'
	) {
		return;
	}

	const arrayIdentifier = getArrayIdentifierFromLengthMemberExpression(cachedLengthInitializer);

	if (!arrayIdentifier) {
		return;
	}

	const operands = getStrictComparisonOperands(test);

	if (
		!operands
		|| !isIdentifierWithName(operands.lesser, indexIdentifier.name)
		|| !isIdentifierWithName(operands.greater, cachedLengthIdentifier.name)
	) {
		return;
	}

	return {
		arrayIdentifier,
		cachedLengthIdentifier,
		indexIdentifierName: indexIdentifier.name,
	};
};

const getLoopInfo = forStatement =>
	getLoopInfoFromSingleDeclarator(forStatement)
	?? getLoopInfoFromCachedLengthDeclarator(forStatement);

const isLiteralOnePlusIdentifierWithName = (node, identifierName) => {
	if (node?.type === 'BinaryExpression' && node.operator === '+') {
		return (isIdentifierWithName(node.left, identifierName) && isLiteralOne(node.right))
			|| (isIdentifierWithName(node.right, identifierName) && isLiteralOne(node.left));
	}

	return false;
};

const isUpdateExpressionIncrementingIndex = (forStatement, indexIdentifierName) => {
	const {update} = forStatement;

	if (!update) {
		return false;
	}

	if (update.type === 'UpdateExpression') {
		return update.operator === '++' && isIdentifierWithName(update.argument, indexIdentifierName);
	}

	if (
		update.type === 'AssignmentExpression'
		&& isIdentifierWithName(update.left, indexIdentifierName)
	) {
		if (update.operator === '+=') {
			return isLiteralOne(update.right);
		}

		if (update.operator === '=') {
			return isLiteralOnePlusIdentifierWithName(update.right, indexIdentifierName);
		}
	}

	return false;
};

const isSequenceUpdateExpressionIncrementingIndexAndReadingCachedLength = (update, indexIdentifierName, cachedLengthIdentifierName) => {
	if (
		update?.type !== 'SequenceExpression'
		|| update.expressions.length !== 2
	) {
		return false;
	}

	const [firstExpression, secondExpression] = update.expressions;

	return (
		isUpdateExpressionIncrementingIndex({update: firstExpression}, indexIdentifierName)
		&& isIdentifierWithName(secondExpression, cachedLengthIdentifierName)
	) || (
		isUpdateExpressionIncrementingIndex({update: secondExpression}, indexIdentifierName)
		&& isIdentifierWithName(firstExpression, cachedLengthIdentifierName)
	);
};

// `[arr[i]]`, `{key: arr[i]}`, and `[...arr[i]]` pass the write through to `arr[i]`
const isDestructuringElement = node => {
	const {parent} = node;
	switch (parent.type) {
		case 'ArrayExpression':
		case 'ArrayPattern': {
			return parent.elements.includes(node);
		}

		case 'ObjectExpression':
		case 'ObjectPattern': {
			return parent.properties.includes(node);
		}

		case 'Property': {
			return parent.value === node;
		}

		case 'RestElement': {
			return parent.argument === node;
		}

		default: {
			return false;
		}
	}
};

const writeTargetParentTypes = new Set([
	'AssignmentExpression',
	'AssignmentPattern',
	'ForOfStatement',
	'ForInStatement',
]);

// `arr[i]` is a write when it is an assignment target, a destructuring target inside one, or the left of a `for…of`/`for…in` head
const isWriteTarget = node => {
	let current = node;
	while (isDestructuringElement(current)) {
		current = current.parent;
	}

	const {parent} = current;
	return writeTargetParentTypes.has(parent.type) && parent.left === current;
};

const isMemberExpressionChanged = node =>
	node.parent.type === 'UpdateExpression'
	|| (node.parent.type === 'UnaryExpression' && node.parent.operator === 'delete')
	|| isWriteTarget(node);

const isOnlyArrayOfIndexVariableRead = (arrayReferences, arrayVariable, indexVariable) => arrayReferences.every(reference => {
	const node = reference.identifier.parent;

	if (node.type !== 'MemberExpression') {
		return false;
	}

	const referencedArrayVariable = getVariableByName(reference.identifier.name, reference.from);

	if (
		referencedArrayVariable !== arrayVariable
		|| !node.computed
		|| node.property.type !== 'Identifier'
		|| getVariableByName(node.property.name, reference.from) !== indexVariable
	) {
		return false;
	}

	return !isMemberExpressionChanged(node);
});

const getRemovalRange = (node, sourceCode) => {
	const declarationNode = node.parent;

	if (declarationNode.declarations.length === 1) {
		const {line} = sourceCode.getLoc(declarationNode).start;
		const lineText = sourceCode.lines[line - 1];

		const isOnlyNodeOnLine = lineText.trim() === sourceCode.getText(declarationNode);

		return isOnlyNodeOnLine
			? [
				sourceCode.getIndexFromLoc({line, column: 0}),
				sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
			]
			: sourceCode.getRange(declarationNode);
	}

	const index = declarationNode.declarations.indexOf(node);

	if (index === 0) {
		return [
			sourceCode.getRange(node)[0],
			sourceCode.getRange(declarationNode.declarations[1])[0],
		];
	}

	return [
		sourceCode.getRange(declarationNode.declarations[index - 1])[1],
		sourceCode.getRange(node)[1],
	];
};

const scopeContains = (ancestor, descendant) => {
	while (descendant) {
		if (descendant === ancestor) {
			return true;
		}

		descendant = descendant.upper;
	}

	return false;
};

const nodeContains = (ancestor, descendant) => {
	while (descendant) {
		if (descendant === ancestor) {
			return true;
		}

		descendant = descendant.parent;
	}

	return false;
};

const isCachedLengthVariableUsedOutsideTest = (forStatement, cachedLengthVariable, cachedLengthIdentifier) =>
	cachedLengthVariable.references.some(reference =>
		reference.identifier !== cachedLengthIdentifier
		&& !nodeContains(forStatement.test, reference.identifier));

const isCachedLengthVariableWrittenInsideLoopOutsideTest = (forStatement, cachedLengthVariable, cachedLengthIdentifier) =>
	cachedLengthVariable.references.some(reference =>
		reference.identifier !== cachedLengthIdentifier
		&& nodeContains(forStatement, reference.identifier)
		&& !nodeContains(forStatement.test, reference.identifier)
		&& reference.isWrite());

// The whole `for (…)` header is replaced, so a comment between the clauses is destroyed too
const hasCommentsInsideLoopHeader = (forStatement, context) => {
	const {sourceCode} = context;
	const openingParenthesisToken = sourceCode.getTokenAfter(sourceCode.getFirstToken(forStatement));
	const closingParenthesisToken = sourceCode.getTokenBefore(forStatement.body);
	const [start] = sourceCode.getRange(openingParenthesisToken);
	const [, end] = sourceCode.getRange(closingParenthesisToken);

	return hasCommentInRange(context, [start, end]);
};

const canRemoveCachedLengthVariable = ({
	forStatement,
	cachedLengthVariable,
	cachedLengthIdentifier,
}) =>
	// The cached length variable is declared in the loop head, so it always resolves when `cachedLengthIdentifier` exists
	!cachedLengthIdentifier
	|| !isCachedLengthVariableUsedOutsideTest(forStatement, cachedLengthVariable, cachedLengthIdentifier);

// `let element = array[index]; element = 1; use(array[index])` would read the reassigned value after the rewrite
const isElementReassignedWhileArrayIsRead = ({elementNode, elementVariable, arrayReferences}) =>
	arrayReferences.length > 1
	&& Boolean(elementVariable?.references.some(reference => reference.isWrite() && reference.identifier !== elementNode.id));

const shouldFixProblem = ({
	forStatement,
	context,
	forScope,
	indexVariable,
	elementNode,
	elementVariable,
	cachedLengthVariable,
	cachedLengthIdentifier,
	isStandardUpdateExpression,
	entriesSupport,
	shouldGenerateIndex,
	isElementNameShadowed,
	arrayReferences,
}) =>
	isStandardUpdateExpression
	&& !isElementNameShadowed
	&& !isElementReassignedWhileArrayIsRead({elementNode, elementVariable, arrayReferences})
	&& !hasCommentsInsideLoopHeader(forStatement, context)
	&& !someVariablesLeakOutOfTheLoop(forStatement, [indexVariable, elementVariable, cachedLengthVariable].filter(Boolean), forScope)
	&& canRemoveCachedLengthVariable({
		forStatement,
		cachedLengthVariable,
		cachedLengthIdentifier,
	})
	&& !elementNode?.id.typeAnnotation
	&& !(shouldGenerateIndex && entriesSupport === entriesUnsupported);

const isIndexVariableUsedElsewhereInTheLoopBody = (indexVariable, bodyScope, arrayIdentifierName) => {
	const inBodyReferences = indexVariable.references.filter(reference => scopeContains(bodyScope, reference.from));

	const referencesOtherThanArrayAccess = inBodyReferences.filter(reference => {
		const node = reference.identifier.parent;

		return node.type !== 'MemberExpression' || node.object.name !== arrayIdentifierName;
	});

	return referencesOtherThanArrayAccess.length > 0;
};

const isIndexVariableAssignedToInTheLoopBody = (indexVariable, bodyScope) =>
	indexVariable.references
		.filter(reference => scopeContains(bodyScope, reference.from))
		.some(inBodyReference => inBodyReference.isWrite());

const someVariablesLeakOutOfTheLoop = (forStatement, variables, forScope) =>
	variables.some(variable => variable.references.some(reference => !(scopeContains(forScope, reference.from) || nodeContains(forStatement, reference.identifier))));

const getReferencesInChildScopes = (scope, name) =>
	getReferences(scope).filter(reference => reference.identifier.name === name);

const isStaticNonArray = (node, context) => {
	const initializer = getConstVariableInitializer(node, context);
	if (initializer && (isNumber(initializer, context) || isBoolean(initializer, context))) {
		return true;
	}

	const staticResult = getStaticValueIfNoSideEffects(node, context);
	if (staticResult) {
		return !Array.isArray(staticResult.value);
	}

	const fallbackStaticResult = getStaticValue(node, context.sourceCode.getScope(node));
	if (!fallbackStaticResult) {
		return false;
	}

	if (hasPotentiallyMutableMemberAccess(node, context)) {
		// A static string may be produced by a method call. Keep this guard because reporting it would be a false positive.
		return typeof fallbackStaticResult.value === 'string';
	}

	return !Array.isArray(fallbackStaticResult.value);
};

const getUpdateExpressionInfo = (forStatement, indexIdentifierName, cachedLengthIdentifier) => {
	const isStandardUpdateExpression = isUpdateExpressionIncrementingIndex(forStatement, indexIdentifierName);
	const isReportOnlyCachedLengthUpdate = cachedLengthIdentifier
		&& isSequenceUpdateExpressionIncrementingIndexAndReadingCachedLength(forStatement.update, indexIdentifierName, cachedLengthIdentifier.name);

	return {
		isStandardUpdateExpression,
		isReportableUpdateExpression: isStandardUpdateExpression || isReportOnlyCachedLengthUpdate,
	};
};

const getBlockStatementScope = (forStatement, scopeManager) => {
	if (forStatement.body?.type !== 'BlockStatement') {
		return;
	}

	return scopeManager.acquire(forStatement.body);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {scopeManager} = sourceCode;

	context.on('ForStatement', node => {
		const loopInfo = getLoopInfo(node);

		if (!loopInfo) {
			return;
		}

		const {arrayIdentifier, cachedLengthIdentifier, indexIdentifierName} = loopInfo;
		if (isStaticNonArray(arrayIdentifier, context)) {
			// Bail out if we can tell that the array variable has a non-array value (i.e. we're looping through the characters of a string constant).
			return;
		}

		const scope = sourceCode.getScope(node);
		const arrayVariable = getVariableByName(arrayIdentifier.name, scope);
		const {
			isStandardUpdateExpression,
			isReportableUpdateExpression,
		} = getUpdateExpressionInfo(node, indexIdentifierName, cachedLengthIdentifier);

		if (!isReportableUpdateExpression) {
			return;
		}

		const bodyScope = getBlockStatementScope(node, scopeManager);

		if (!bodyScope) {
			return;
		}

		const arrayIdentifierName = arrayIdentifier.name;
		const indexVariable = getVariableByName(indexIdentifierName, bodyScope);

		if (!indexVariable || isIndexVariableAssignedToInTheLoopBody(indexVariable, bodyScope)) {
			return;
		}

		const arrayReferences = getReferencesInChildScopes(bodyScope, arrayIdentifierName);

		if (
			arrayReferences.length === 0
			|| !isOnlyArrayOfIndexVariableRead(arrayReferences, arrayVariable, indexVariable)
		) {
			return;
		}

		const forScope = scopeManager.acquire(node);
		const cachedLengthVariable = cachedLengthIdentifier && (
			getVariableByName(cachedLengthIdentifier.name, forScope)
			?? getVariableByName(cachedLengthIdentifier.name, scope)
		);

		if (
			cachedLengthVariable
			&& isCachedLengthVariableWrittenInsideLoopOutsideTest(node, cachedLengthVariable, cachedLengthIdentifier)
		) {
			return;
		}

		const [start] = sourceCode.getRange(node);
		const closingParenthesisToken = sourceCode.getTokenBefore(node.body, isClosingParenToken);
		const [, end] = sourceCode.getRange(closingParenthesisToken);

		const problem = {
			loc: toLocation([start, end], context),
			messageId: MESSAGE_ID,
		};

		const elementReference = arrayReferences.find(reference => {
			const node = reference.identifier.parent;

			return node.parent.type === 'VariableDeclarator';
		});
		const elementNode = elementReference?.identifier.parent.parent;
		const elementIdentifierName = elementNode?.id.name;
		const elementVariable = elementIdentifierName && getVariableByName(elementIdentifierName, bodyScope);

		// A nested block can already declare the element name, and the loop head would shadow it, or a rewritten `array[index]` would resolve to it (`{ const element = array[index]; }` in two blocks would become `const element = element`)
		const isElementNameShadowed = Boolean(elementIdentifierName)
			&& getScopes(bodyScope)
				.some(scope => scope !== bodyScope && getVariableByName(elementIdentifierName, scope) !== elementVariable);

		const shouldGenerateIndex = isIndexVariableUsedElsewhereInTheLoopBody(indexVariable, bodyScope, arrayIdentifierName);
		const entriesSupport = shouldGenerateIndex ? getEntriesSupport(arrayIdentifier, context) : entriesUnknown;

		const shouldFix = shouldFixProblem({
			forStatement: node,
			context,
			forScope,
			indexVariable,
			elementNode,
			elementVariable,
			cachedLengthVariable,
			cachedLengthIdentifier,
			isStandardUpdateExpression,
			entriesSupport,
			shouldGenerateIndex,
			isElementNameShadowed,
			arrayReferences,
		});

		if (shouldFix) {
			problem.fix = function * (fixer, {abort}) {
				const element = elementIdentifierName
					|| getAvailableVariableName(singular(arrayIdentifierName) || defaultElementName, getScopes(bodyScope));

				let declarationElement = element;
				let declarationType = 'const';
				let isRemoveDeclaration = true;

				if (elementNode) {
					if (elementNode.id.type === 'ObjectPattern' || elementNode.id.type === 'ArrayPattern') {
						isRemoveDeclaration = arrayReferences.length === 1;
					}

					if (isRemoveDeclaration) {
						declarationType = elementNode.parent.kind;
						declarationElement = sourceCode.getText(elementNode.id);
					}
				}

				const parts = [declarationType];
				const index = indexIdentifierName;
				const array = arrayIdentifierName;
				if (shouldGenerateIndex) {
					parts.push(` [${index}, ${declarationElement}] of ${array}.entries()`);
				} else {
					parts.push(` ${declarationElement} of ${array}`);
				}

				const replacement = parts.join('');
				const [start] = sourceCode.getRange(node.init);
				// The parentheses around the update are not part of its range, they would be left dangling after the new `for…of` head
				const [, end] = getParenthesizedRange(node.update, context);

				yield fixer.replaceTextRange([start, end], replacement);

				for (const reference of arrayReferences) {
					if (reference === elementReference) {
						continue;
					}

					// `array[/* comment */ index]` is replaced as a whole
					if (sourceCode.getCommentsInside(reference.identifier.parent).length > 0) {
						return abort();
					}

					yield fixer.replaceText(reference.identifier.parent, element);
				}

				if (!elementNode) {
					return;
				}

				// The element declaration is removed or its `array[index]` initializer is rewritten, a comment inside the rewritten range would be lost. The removal range also covers the `var`/`let`/`const` keyword and the trailing semicolon.
				const rewrittenRange = isRemoveDeclaration
					? getRemovalRange(elementNode, sourceCode)
					: sourceCode.getRange(elementNode.init);

				if (hasCommentInRange(context, rewrittenRange)) {
					return abort();
				}

				yield isRemoveDeclaration
					? fixer.removeRange(rewrittenRange)
					: fixer.replaceText(elementNode.init, element);
			};
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Do not use a `for` loop that can be replaced with a `for-of` loop.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
