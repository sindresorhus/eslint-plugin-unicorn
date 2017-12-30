'use strict';

const customError = /^(?:[A-Z][a-z0-9]*)*Error$/;
const isReferenceAssigned = expression => {
	if (expression.type === 'AssignmentExpression') {
		const assignedVariable = expression.left;
		return assignedVariable.type === 'Identifier' && assignedVariable.name;
	}
	return false;
};

const findIdentifierValues = (identifierNode, context) => {
	const scope = context.getScope(identifierNode);
	const declarations = scope.set.get(identifierNode.name);
	if (declarations === undefined) {
		return [];
	}

	const expressions = declarations.references.map(reference => reference.identifier.parent);
	const referenceValues = [];
	expressions.forEach(expression => {
		if (isReferenceAssigned(expression)) {
			referenceValues.push(expression.right);
		} else if (expression.type === 'VariableDeclarator') {
			referenceValues.push(expression.init);
		}
	});
	return referenceValues;
};

const isEmptyMessageString = node => {
	return node.arguments.length > 0 && node.arguments[0].type === 'Literal' && !node.arguments[0].value;
};

const reportError = (expressionNode, context) => {
	const error = expressionNode.callee;
	if (customError.test(error.name)) {
		if (expressionNode.arguments.length === 0) {
			context.report({
				node: expressionNode.parent,
				message: 'Pass a message to the error object'
			});
		}

		if (isEmptyMessageString(expressionNode)) {
			context.report({
				node: expressionNode.parent,
				message: 'Error message should not be an empty string'
			});
		}
	}
};

const checkErrorMessage = (node, context) => {
	if (node.type === 'Identifier') {
		const identifierValues = findIdentifierValues(node, context);
		identifierValues.forEach(node => checkErrorMessage(node, context));
	} else if (node.type === 'NewExpression' || node.type === 'CallExpression') {
		reportError(node, context);
	}
};

const create = context => {
	const throwStatements = [];
	return {
		'ThrowStatement'(throwStatement) {
			throwStatements.push(throwStatement);
		},
		'Program:exit'() {
			throwStatements.forEach(throwStatement => checkErrorMessage(throwStatement.argument, context));
		}
	};
};

module.exports = {
	create,
	meta: {}
};
