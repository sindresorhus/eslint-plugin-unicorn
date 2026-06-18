import {isClosingParenToken, getStaticValue} from '@eslint-community/eslint-utils';
import {
	getAvailableVariableName,
	getScopes,
	getVariableByName,
	singular,
	toLocation,
	getReferences,
	isArray,
	isNullishType,
	isUnknownType,
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

	if (entriesSupports.includes(entriesUnsupported)) {
		return entriesUnsupported;
	}

	return entriesUnknown;
};

const combineIntersectionEntriesSupport = entriesSupports => {
	if (entriesSupports.includes(entriesSupported)) {
		return entriesSupported;
	}

	if (entriesSupports.every(entriesSupport => entriesSupport === entriesUnsupported)) {
		return entriesUnsupported;
	}

	return entriesUnknown;
};

const getTypeName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		const left = getTypeName(typeName.left);
		return left ? `${left}.${typeName.right.name}` : undefined;
	}
};

const getTypeReferenceEntriesSupport = (node, scope, visitedTypeReferenceNames) => {
	const typeReferenceName = getTypeName(node.typeName);

	if (!typeReferenceName) {
		return entriesUnknown;
	}

	if (typeReferenceName === 'Array' || typeReferenceName === 'ReadonlyArray') {
		return entriesSupported;
	}

	if (noEntriesTypeNames.has(typeReferenceName)) {
		return entriesUnsupported;
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return entriesUnknown;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const typeVariable = scope && getVariableByName(typeReferenceName, scope);
	const [definition] = typeVariable?.defs ?? [];

	if (!definition || definition.type !== 'Type') {
		visitedTypeReferenceNames.delete(typeReferenceName);
		return entriesUnknown;
	}

	let entriesSupport = entriesUnknown;

	if (definition.node.type === 'TSTypeAliasDeclaration') {
		entriesSupport = getTypeAnnotationEntriesSupport(definition.node.typeAnnotation, scope, visitedTypeReferenceNames);
	} else if (definition.node.type === 'TSTypeParameter') {
		entriesSupport = getTypeAnnotationEntriesSupport(definition.node.constraint, scope, visitedTypeReferenceNames);
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return entriesSupport;
};

const getTypeAnnotationEntriesSupport = (node, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationEntriesSupport(node.typeAnnotation, scope, visitedTypeReferenceNames);
		}

		case 'TSArrayType':
		case 'TSTupleType': {
			return entriesSupported;
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationEntriesSupport(node.typeAnnotation, scope, visitedTypeReferenceNames)
				: entriesUnknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceEntriesSupport(node, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineUnionEntriesSupport(node.types.map(type => getTypeAnnotationEntriesSupport(type, scope, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionEntriesSupport(node.types.map(type => getTypeAnnotationEntriesSupport(type, scope, visitedTypeReferenceNames)));
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

const getIteratorResultValueType = (type, checker) => {
	const next = checker.getTypeOfPropertyOfType(type, 'next');
	const [nextSignature] = next?.getCallSignatures() ?? [];

	if (!nextSignature) {
		return;
	}

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
	} catch {
		return entriesUnknown;
	}
};

const isNoEntriesDomCollectionCall = (node, context) =>
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

	if (
		entriesSupport === entriesUnknown
		&& definition.type === 'Variable'
		&& definition.parent.kind === 'const'
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
		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
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
			return isNoEntriesDomCollectionCall(node, context) ? entriesUnsupported : entriesUnknown;
		}
	}
}

function getEntriesSupport(node, context, visitedVariables = new Set()) {
	if (isArray(node, context)) {
		return entriesSupported;
	}

	const entriesSupportFromTypeInformation = getEntriesSupportFromTypeInformation(node, context);
	if (entriesSupportFromTypeInformation !== entriesUnknown) {
		return entriesSupportFromTypeInformation;
	}

	return getEntriesSupportFromSyntax(node, context, visitedVariables);
}

const getLoopInfoFromSingleDeclarator = forStatement => {
	const {init: variableDeclaration} = forStatement;

	if (
		!variableDeclaration
		|| variableDeclaration.type !== 'VariableDeclaration'
	) {
		return;
	}

	if (variableDeclaration.declarations.length !== 1) {
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

const isMemberExpressionChanged = node =>
	(
		node.parent.type === 'AssignmentExpression'
		&& node.parent.left === node
	)
	|| node.parent.type === 'UpdateExpression'
	|| (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
	);

const isOnlyArrayOfIndexVariableRead = (arrayReferences, arrayVariable, indexVariable) => arrayReferences.every(reference => {
	const node = reference.identifier.parent;

	if (node.type !== 'MemberExpression') {
		return false;
	}

	const referencedArrayVariable = getVariableByName(reference.identifier.name, reference.from);

	if (referencedArrayVariable !== arrayVariable) {
		return false;
	}

	if (
		!node.computed
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

const hasCommentsInsideLoopHeader = (forStatement, sourceCode) =>
	[
		forStatement.init,
		forStatement.test,
		forStatement.update,
	].some(node => node && sourceCode.getCommentsInside(node).length > 0);

const canRemoveCachedLengthVariable = ({
	forStatement,
	cachedLengthVariable,
	cachedLengthIdentifier,
}) => {
	if (!cachedLengthIdentifier) {
		return true;
	}

	if (!cachedLengthVariable) {
		return false;
	}

	return !(
		isCachedLengthVariableUsedOutsideTest(forStatement, cachedLengthVariable, cachedLengthIdentifier)
	);
};

const shouldFixProblem = ({
	forStatement,
	sourceCode,
	forScope,
	indexVariable,
	elementNode,
	elementVariable,
	cachedLengthVariable,
	cachedLengthIdentifier,
	isStandardUpdateExpression,
	entriesSupport,
	shouldGenerateIndex,
}) =>
	isStandardUpdateExpression
	&& !hasCommentsInsideLoopHeader(forStatement, sourceCode)
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

		if (node.type !== 'MemberExpression') {
			return true;
		}

		return node.object.name !== arrayIdentifierName;
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

const isStaticNonArray = (node, scope) => {
	const staticResult = getStaticValue(node, scope);
	return Boolean(staticResult && !Array.isArray(staticResult.value));
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {scopeManager} = sourceCode;

	context.on('ForStatement', node => {
		const loopInfo = getLoopInfo(node);

		if (!loopInfo) {
			return;
		}

		const {arrayIdentifier, cachedLengthIdentifier, indexIdentifierName} = loopInfo;
		const scope = sourceCode.getScope(node);
		if (isStaticNonArray(arrayIdentifier, scope)) {
			// Bail out if we can tell that the array variable has a non-array value (i.e. we're looping through the characters of a string constant).
			return;
		}

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

		if (!indexVariable) {
			return;
		}

		if (isIndexVariableAssignedToInTheLoopBody(indexVariable, bodyScope)) {
			return;
		}

		const arrayReferences = getReferencesInChildScopes(bodyScope, arrayIdentifierName);

		if (arrayReferences.length === 0) {
			return;
		}

		if (!isOnlyArrayOfIndexVariableRead(arrayReferences, arrayVariable, indexVariable)) {
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

		const shouldGenerateIndex = isIndexVariableUsedElsewhereInTheLoopBody(indexVariable, bodyScope, arrayIdentifierName);
		const entriesSupport = shouldGenerateIndex ? getEntriesSupport(arrayIdentifier, context) : entriesUnknown;

		const shouldFix = shouldFixProblem({
			forStatement: node,
			sourceCode,
			forScope,
			indexVariable,
			elementNode,
			elementVariable,
			cachedLengthVariable,
			cachedLengthIdentifier,
			isStandardUpdateExpression,
			entriesSupport,
			shouldGenerateIndex,
		});

		if (shouldFix) {
			problem.fix = function * (fixer) {
				const element = elementIdentifierName
					|| getAvailableVariableName(singular(arrayIdentifierName) || defaultElementName, getScopes(bodyScope));

				let declarationElement = element;
				let declarationType = 'const';
				let removeDeclaration = true;

				if (elementNode) {
					if (elementNode.id.type === 'ObjectPattern' || elementNode.id.type === 'ArrayPattern') {
						removeDeclaration = arrayReferences.length === 1;
					}

					if (removeDeclaration) {
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
				const [, end] = sourceCode.getRange(node.update);

				yield fixer.replaceTextRange([start, end], replacement);

				for (const reference of arrayReferences) {
					if (reference !== elementReference) {
						yield fixer.replaceText(reference.identifier.parent, element);
					}
				}

				if (elementNode) {
					yield removeDeclaration
						? fixer.removeRange(getRemovalRange(elementNode, sourceCode))
						: fixer.replaceText(elementNode.init, element);
				}
			};
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
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
