'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_MISSING_MESSAGE = 'constructorMissingMessage';
const MESSAGE_ID_EMPTY_MESSAGE = 'emptyMessage';
const messages = {
	[MESSAGE_ID_MISSING_MESSAGE]: 'Pass a message to the error constructor.',
	[MESSAGE_ID_EMPTY_MESSAGE]: 'Error message should not be an empty string.'
};

const errorConstructors = new Set([
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
	'Error',
	'EvalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError',
	'InternalError'
]);

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
	for (const expression of expressions) {
		if (isReferenceAssigned(expression)) {
			referenceValues.push(expression.right);
		} else if (expression.type === 'VariableDeclarator') {
			referenceValues.push(expression.init);
		}
	}

	return referenceValues;
};

const isEmptyMessageString = node => {
	return (
		node.arguments.length > 0 &&
		node.arguments[0].type === 'Literal' &&
		!node.arguments[0].value
	);
};

const reportError = (expressionNode, context) => {
	const error = expressionNode.callee;
	if (errorConstructors.has(error.name)) {
		if (expressionNode.arguments.length === 0) {
			context.report({
				node: expressionNode.parent,
				messageId: MESSAGE_ID_MISSING_MESSAGE
			});
		}

		if (isEmptyMessageString(expressionNode)) {
			context.report({
				node: expressionNode.parent,
				messageId: MESSAGE_ID_EMPTY_MESSAGE
			});
		}
	}
};

const checkErrorMessage = (node, context) => {
	if (node.type === 'Identifier') {
		const identifierValues = findIdentifierValues(node, context);
		for (const node of identifierValues) {
			checkErrorMessage(node, context);
		}
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
			for (const throwStatement of throwStatements) {
				checkErrorMessage(throwStatement.argument, context);
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
