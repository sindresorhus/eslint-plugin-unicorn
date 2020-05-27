'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');
const {flatten} = require('lodash');
const avoidCapture = require('./utils/avoid-capture');
const {singular} = require('pluralize');

const defaultElementName = 'element';
const isLiteralZero = node => isLiteralValue(node, 0);
const isLiteralOne = node => isLiteralValue(node, 1);

const isIdentifierWithName = (node, name) => node && node.type === 'Identifier' && node.name === name;

const getIndexIdentifierName = forStatement => {
	const {init: variableDeclaration} = forStatement;

	if (
		!variableDeclaration ||
		variableDeclaration.type !== 'VariableDeclaration'
	) {
		return;
	}

	if (variableDeclaration.declarations.length !== 1) {
		return;
	}

	const [variableDeclarator] = variableDeclaration.declarations;

	if (!isLiteralZero(variableDeclarator.init)) {
		return;
	}

	if (variableDeclarator.id.type !== 'Identifier') {
		return;
	}

	return variableDeclarator.id.name;
};

const getStrictComparisonOperands = binaryExpression => {
	if (binaryExpression.operator === '<') {
		return {
			lesser: binaryExpression.left,
			greater: binaryExpression.right
		};
	}

	if (binaryExpression.operator === '>') {
		return {
			lesser: binaryExpression.right,
			greater: binaryExpression.left
		};
	}
};

const getArrayIdentifierNameFromBinaryExpression = (binaryExpression, indexIdentifierName) => {
	const operands = getStrictComparisonOperands(binaryExpression);

	if (!operands) {
		return;
	}

	const {lesser, greater} = operands;

	if (!isIdentifierWithName(lesser, indexIdentifierName)) {
		return;
	}

	if (greater.type !== 'MemberExpression') {
		return;
	}

	if (
		greater.object.type !== 'Identifier' ||
		greater.property.type !== 'Identifier'
	) {
		return;
	}

	if (greater.property.name !== 'length') {
		return;
	}

	return greater.object.name;
};

const getArrayIdentifierName = (forStatement, indexIdentifierName) => {
	const {test} = forStatement;

	if (!test || test.type !== 'BinaryExpression') {
		return;
	}

	return getArrayIdentifierNameFromBinaryExpression(test, indexIdentifierName);
};

const isLiteralOnePlusIdentifierWithName = (node, identifierName) => {
	if (node && node.type === 'BinaryExpression' && node.operator === '+') {
		return (isIdentifierWithName(node.left, identifierName) && isLiteralOne(node.right)) ||
			(isIdentifierWithName(node.right, identifierName) && isLiteralOne(node.left));
	}

	return false;
};

const checkUpdateExpression = (forStatement, indexIdentifierName) => {
	const {update} = forStatement;

	if (!update) {
		return false;
	}

	if (update.type === 'UpdateExpression') {
		return update.operator === '++' && isIdentifierWithName(update.argument, indexIdentifierName);
	}

	if (
		update.type === 'AssignmentExpression' &&
		isIdentifierWithName(update.left, indexIdentifierName)
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

const isOnlyArrayOfIndexVariableRead = (arrayReferences, indexIdentifierName) => {
	return arrayReferences.every(reference => {
		const node = reference.identifier.parent;

		if (node.type !== 'MemberExpression') {
			return false;
		}

		if (node.property.name !== indexIdentifierName) {
			return false;
		}

		if (
			node.parent.type === 'AssignmentExpression' &&
			node.parent.left === node
		) {
			return false;
		}

		return true;
	});
};

const getRemovalRange = (node, sourceCode) => {
	const declarationNode = node.parent;

	if (declarationNode.declarations.length === 1) {
		const {line} = sourceCode.getLocFromIndex(declarationNode.range[0]);
		const lineText = sourceCode.lines[line - 1];

		const isOnlyNodeOnLine = lineText.trim() === sourceCode.getText(declarationNode);

		return isOnlyNodeOnLine ? [
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0})
		] : declarationNode.range;
	}

	const index = declarationNode.declarations.indexOf(node);

	if (index === 0) {
		return [
			node.range[0],
			declarationNode.declarations[1].range[0]
		];
	}

	return [
		declarationNode.declarations[index - 1].range[1],
		node.range[1]
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

const isIndexVariableAssignedToInTheLoopBody = (indexVariable, bodyScope) => {
	return indexVariable.references
		.filter(reference => scopeContains(bodyScope, reference.from))
		.some(inBodyReference => inBodyReference.isWrite());
};

const someVariablesLeakOutOfTheLoop = (forStatement, variables, forScope) => {
	return variables.some(variable => {
		return !variable.references.every(reference => {
			return scopeContains(forScope, reference.from) ||
				nodeContains(forStatement, reference.identifier);
		});
	});
};

const getReferencesInChildScopes = (scope, name) => {
	const references = scope.references.filter(reference => reference.identifier.name === name);
	return [
		...references,
		...flatten(scope.childScopes.map(s => getReferencesInChildScopes(s, name)))
	];
};

const getChildScopesRecursive = scope => [
	scope,
	...flatten(scope.childScopes.map(scope => getChildScopesRecursive(scope)))
];

const getSingularName = originalName => {
	const singularName = singular(originalName);
	if (singularName !== originalName) {
		return singularName;
	}
};

const create = context => {
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	return {
		ForStatement(node) {
			const indexIdentifierName = getIndexIdentifierName(node);

			if (!indexIdentifierName) {
				return;
			}

			const arrayIdentifierName = getArrayIdentifierName(node, indexIdentifierName);

			if (!arrayIdentifierName) {
				return;
			}

			if (!checkUpdateExpression(node, indexIdentifierName)) {
				return;
			}

			if (!node.body || node.body.type !== 'BlockStatement') {
				return;
			}

			const forScope = scopeManager.acquire(node);
			const bodyScope = scopeManager.acquire(node.body);

			if (!bodyScope) {
				return;
			}

			const indexVariable = resolveIdentifierName(indexIdentifierName, bodyScope);

			if (isIndexVariableAssignedToInTheLoopBody(indexVariable, bodyScope)) {
				return;
			}

			const arrayReferences = getReferencesInChildScopes(bodyScope, arrayIdentifierName);

			if (arrayReferences.length === 0) {
				return;
			}

			if (!isOnlyArrayOfIndexVariableRead(arrayReferences, indexIdentifierName)) {
				return;
			}

			const problem = {
				node,
				message: 'Use a `for-of` loop instead of this `for` loop.'
			};

			const elementReference = arrayReferences.find(reference => {
				const node = reference.identifier.parent;

				if (node.parent.type !== 'VariableDeclarator') {
					return false;
				}

				return true;
			});
			const elementNode = elementReference && elementReference.identifier.parent.parent;
			const elementIdentifierName = elementNode && elementNode.id.name;
			const elementVariable = elementIdentifierName && resolveIdentifierName(elementIdentifierName, bodyScope);

			const shouldFix = !someVariablesLeakOutOfTheLoop(node, [indexVariable, elementVariable].filter(Boolean), forScope);

			if (shouldFix) {
				problem.fix = function * (fixer) {
					const shouldGenerateIndex = isIndexVariableUsedElsewhereInTheLoopBody(indexVariable, bodyScope, arrayIdentifierName);

					const index = indexIdentifierName;
					const element = elementIdentifierName ||
						avoidCapture(getSingularName(arrayIdentifierName) || defaultElementName, getChildScopesRecursive(bodyScope), context.parserOptions.ecmaVersion);
					const array = arrayIdentifierName;

					let declarationElement = element;
					let declarationType = 'const';
					let removeDeclaration = true;
					if (
						elementNode &&
						(elementNode.id.type === 'ObjectPattern' || elementNode.id.type === 'ArrayPattern')
					) {
						removeDeclaration = arrayReferences.length === 1;

						if (removeDeclaration) {
							declarationType = elementNode.parent.kind;
							declarationElement = sourceCode.getText(elementNode.id);
						}
					}

					const replacement = shouldGenerateIndex ?
						`${declarationType} [${index}, ${declarationElement}] of ${array}.entries()` :
						`${declarationType} ${declarationElement} of ${array}`;

					yield fixer.replaceTextRange([
						node.init.range[0],
						node.update.range[1]
					], replacement);

					for (const reference of arrayReferences) {
						if (reference !== elementReference) {
							yield fixer.replaceText(reference.identifier.parent, element);
						}
					}

					if (elementNode) {
						if (removeDeclaration) {
							yield fixer.removeRange(getRemovalRange(elementNode, sourceCode));
						} else {
							yield fixer.replaceText(elementNode.init, element);
						}
					}
				};
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
