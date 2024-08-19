'use strict';
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').IfStatement} node */
	IfStatement(node) {
		if (node.test.type !== 'BinaryExpression') {
			return;
		}

		/** @type {import('estree').BinaryExpression | undefined} */
		let testNode;
		let variableName = '';
		let literalValue = 0;
		let operator = '';

		if (
			// Match case: index === -1
			node.test.left.type === 'Identifier'
			&& node.test.right.type === 'Literal'
		) {
			testNode = node.test;
			variableName = testNode.left.name;
			literalValue = testNode.right.value;
			operator = testNode.operator;
		} else if (
			// Match case: -1 === index
			node.test.right.type === 'Identifier'
			&& node.test.left.type === 'Literal'
		) {
			testNode = node.test;
			variableName = testNode.right.name;
			literalValue = testNode.left.value;
			operator = reverseOperator(testNode.operator);
		}

		if (!testNode) {
			return;
		}

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

		const variable = resolveVariableName(
			variableName,
			context.sourceCode.getScope(node),
		);

		if (!variable) {
			return;
		}

		for (const definition of variable.defs) {
			if (definition.type === 'Variable') {
				if (!isIndexOfCallExpression(definition.node.init)) {
					break;
				}

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
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce consistent styling when checking for element existence using `indexOf()`',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
