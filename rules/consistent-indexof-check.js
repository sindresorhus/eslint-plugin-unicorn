'use strict';
const evaluateLiteralUnaryExpression = require('./utils/evaluate-literal-unaryexpression.js');
const resolveVariableName = require('./utils/resolve-variable-name.js');

const MESSAGE_ID = 'consistent-indexof-check';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

/**
Check if the node is a call expression of `indexOf` method.

@param {import('estree').Node} node
@returns {node is import('estree').CallExpression}
*/
function isIndexOfCallExpression(node) {
	return (
		node
		&& node.type === 'CallExpression'
		&& node.callee.type === 'MemberExpression'
		&& node.callee.property.name === 'indexOf'
		&& node.arguments.length === 1
	);
}

/**
Check if the operator is `<` or `<=` and the value is `0` or `-1`.

@param {string} operator
@param {string} value
@returns {boolean}
*/
function isCheckNotExists(operator, value) {
	return (
		(operator === '<' && value <= 0)
		|| (operator === '<=' && value <= -1)
	);
}

/**
Check if the operator is `>` or `>=` and the value is `-1` or `0`.

@param {string} operator
@param {number} value
@returns {boolean}
*/
function isCheckExists(operator, value) {
	return (
		(operator === '>' && value === -1)
		|| (operator === '>=' && value === 0)
	);
}

/**
Reverse the operator.

@param {string} operator
@returns {string}
*/
function reverseOperator(operator) {
	switch (operator) {
		case '<': {
			return '>';
		}

		case '<=': {
			return '>=';
		}

		case '>': {
			return '<';
		}

		case '>=': {
			return '<=';
		}

		default: {
			return operator;
		}
	}
}

/**
Check if the node is a number literal.

@param {import('estree').Node} node
@returns {node is import('estree').UnaryExpression | import('estree').Literal}
*/
function isNumberLiteral(node) {
	if (node.type === 'UnaryExpression' && ['-', '+', '~'].includes(node.operator)) {
		return isNumberLiteral(node.argument);
	}

	return node.type === 'Literal' && typeof node.value === 'number';
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').IfStatement} node */
	IfStatement(node) {
		if (node.test.type !== 'BinaryExpression') {
			return;
		}

		/** @type {import('estree').BinaryExpression | undefined} */
		let testNode;
		/** @type {import('estree').Node | undefined} */
		let variableNode;
		let literalValue = 0;
		let operator = '';

		if (
			// Match case: `index === -1` and `foo.indexOf('bar') === -1`
			(node.test.left.type === 'Identifier' || isIndexOfCallExpression(node.test.left))
			&& isNumberLiteral(node.test.right)
		) {
			testNode = node.test;
			variableNode = testNode.left;
			literalValue = evaluateLiteralUnaryExpression(testNode.right);
			operator = testNode.operator;
		} else if (
			// Match case: `-1 === index` and `-1 === foo.indexOf('bar')`
			(node.test.right.type === 'Identifier' || isIndexOfCallExpression(node.test.right))
			&& isNumberLiteral(node.test.left)
		) {
			testNode = node.test;
			variableNode = testNode.right;
			literalValue = evaluateLiteralUnaryExpression(testNode.left);
			operator = reverseOperator(testNode.operator);
		}

		if (!testNode) {
			return;
		}

		const variableName = context.sourceCode.getText(variableNode);

		let replacement = '';

		// For better performance, early checking of operators can avoid looking up variables in scope.
		if (isCheckNotExists(operator, literalValue)) {
			replacement = `${variableName} === -1`;
		} else if (isCheckExists(operator, literalValue)) {
			replacement = `${variableName} !== -1`;
		}

		if (!replacement) {
			return;
		}

		if (variableNode.type === 'Identifier') {
			const variableFound = resolveVariableName(
				variableName,
				context.sourceCode.getScope(node),
			);

			if (!variableFound) {
				return;
			}

			for (const definition of variableFound.defs) {
				if (definition.type === 'Variable' && isIndexOfCallExpression(definition.node.init)) {
					context.report({
						node: testNode,
						messageId: MESSAGE_ID,
						data: {
							value: context.sourceCode.getText(testNode),
							replacement,
						},
						fix: fixer => fixer.replaceText(testNode, replacement),
					});
				}
			}
		} else if (isIndexOfCallExpression(variableNode)) {
			context.report({
				node: testNode,
				messageId: MESSAGE_ID,
				data: {
					value: context.sourceCode.getText(testNode),
					replacement,
				},
				fix: fixer => fixer.replaceText(testNode, replacement),
			});
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce consistent style when checking for element existence with `indexOf()`',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
