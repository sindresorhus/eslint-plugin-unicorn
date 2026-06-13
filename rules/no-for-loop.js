import {isClosingParenToken, getStaticValue} from '@eslint-community/eslint-utils';
import {
	getAvailableVariableName,
	getScopes,
	singular,
	toLocation,
	getReferences,
} from './utils/index.js';
import {isLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-for-loop';
const messages = {
	[MESSAGE_ID]: 'Use a `for-of` loop instead of this `for` loop.',
};

const defaultElementName = 'element';
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

const getTypeReferenceTypeAnnotation = (typeReferenceName, scope) => {
	const typeVariable = scope && resolveIdentifierName(typeReferenceName, scope);
	const [definition] = typeVariable?.defs ?? [];

	if (!definition || definition.type !== 'Type') {
		return;
	}

	if (definition.node.type === 'TSTypeAliasDeclaration') {
		return definition.node.typeAnnotation;
	}

	if (definition.node.type === 'TSTypeParameter') {
		return definition.node.constraint;
	}
};

const isArrayTypeReference = (node, scope, visitedTypeReferenceNames) => {
	if (node.typeName.type !== 'Identifier') {
		return false;
	}

	const typeReferenceName = node.typeName.name;

	if (typeReferenceName === 'Array' || typeReferenceName === 'ReadonlyArray') {
		return true;
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return false;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const typeAnnotation = getTypeReferenceTypeAnnotation(typeReferenceName, scope);
	const isArray = isArrayType(typeAnnotation, scope, visitedTypeReferenceNames);

	visitedTypeReferenceNames.delete(typeReferenceName);

	return isArray;
};

const isArrayType = (node, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSArrayType':
		case 'TSTupleType': {
			return true;
		}

		case 'TSTypeReference': {
			return isArrayTypeReference(node, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly' && isArrayType(node.typeAnnotation, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return node.types.every(type => isArrayType(type, scope, visitedTypeReferenceNames));
		}

		case 'TSIntersectionType': {
			return node.types.some(type => isArrayType(type, scope, visitedTypeReferenceNames));
		}

		default: {
			return false;
		}
	}
};

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

	const referencedArrayVariable = resolveIdentifierName(reference.identifier.name, reference.from);

	if (referencedArrayVariable !== arrayVariable) {
		return false;
	}

	if (
		!node.computed
		|| node.property.type !== 'Identifier'
		|| resolveIdentifierName(node.property.name, reference.from) !== indexVariable
	) {
		return false;
	}

	if (isMemberExpressionChanged(node)) {
		return false;
	}

	return true;
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

const resolveIdentifierName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
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
	hasNonArrayTypeAnnotation,
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
	&& !(hasNonArrayTypeAnnotation && shouldGenerateIndex);

const isIndexVariableUsedElsewhereInTheLoopBody = (indexVariable, bodyScope, arrayIdentifierName) => {
	const inBodyReferences = indexVariable.references.filter(reference => scopeContains(bodyScope, reference.from));

	const referencesOtherThanArrayAccess = inBodyReferences.filter(reference => {
		const node = reference.identifier.parent;

		if (node.type !== 'MemberExpression') {
			return true;
		}

		if (node.object.name !== arrayIdentifierName) {
			return true;
		}

		return false;
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
		const arrayVariable = resolveIdentifierName(arrayIdentifier.name, scope);
		const staticResult = getStaticValue(arrayIdentifier, scope);
		if (staticResult && !Array.isArray(staticResult.value)) {
			// Bail out if we can tell that the array variable has a non-array value (i.e. we're looping through the characters of a string constant).
			return;
		}

		const isStandardUpdateExpression = isUpdateExpressionIncrementingIndex(node, indexIdentifierName);
		const isReportOnlyCachedLengthUpdate = cachedLengthIdentifier
			&& isSequenceUpdateExpressionIncrementingIndexAndReadingCachedLength(node.update, indexIdentifierName, cachedLengthIdentifier.name);

		if (!isStandardUpdateExpression && !isReportOnlyCachedLengthUpdate) {
			return;
		}

		if (!node.body || node.body.type !== 'BlockStatement') {
			return;
		}

		const bodyScope = scopeManager.acquire(node.body);

		if (!bodyScope) {
			return;
		}

		const arrayIdentifierName = arrayIdentifier.name;
		const indexVariable = resolveIdentifierName(indexIdentifierName, bodyScope);

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
			resolveIdentifierName(cachedLengthIdentifier.name, forScope)
			?? resolveIdentifierName(cachedLengthIdentifier.name, scope)
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

			if (node.parent.type !== 'VariableDeclarator') {
				return false;
			}

			return true;
		});
		const elementNode = elementReference?.identifier.parent.parent;
		const elementIdentifierName = elementNode?.id.name;
		const elementVariable = elementIdentifierName && resolveIdentifierName(elementIdentifierName, bodyScope);

		const shouldGenerateIndex = isIndexVariableUsedElsewhereInTheLoopBody(indexVariable, bodyScope, arrayIdentifierName);

		// When `.entries()` would be generated, only autofix if the type annotation confirms it's an array (or there's no type annotation).
		const hasNonArrayTypeAnnotation = resolveIdentifierName(arrayIdentifierName, scope)
			?.defs.some(definition => {
				const typeAnnotation = definition.name.typeAnnotation?.typeAnnotation;
				return typeAnnotation && !isArrayType(typeAnnotation, scope);
			});

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
			hasNonArrayTypeAnnotation,
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
						declarationType = element.type === 'VariableDeclarator' ? elementNode.kind : elementNode.parent.kind;
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
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
