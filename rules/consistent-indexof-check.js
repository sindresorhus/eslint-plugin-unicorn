'use strict';
const evaluateLiteralUnaryExpression = require('./utils/evaluate-literal-unaryexpression.js');
const resolveVariableName = require('./utils/resolve-variable-name.js');

const MESSAGE_ID = 'consistent-indexof-check';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

/**
Check if the node is a call expression of `indexOf` or `lastIndexOf` method.

@param {import('estree').Node} node
@returns {node is import('estree').CallExpression}
*/
function isIndexOfCallExpression(node) {
	return (
		node
		&& node.type === 'CallExpression'
		&& node.callee.type === 'MemberExpression'
		&& ['indexOf', 'lastIndexOf'].includes(node.callee.property.name)
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
Reverse the comparison operator.

@param {string} operator
@returns {string}
*/
function reverseComparisonOperator(operator) {
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
	/** @param {import('estree').BinaryExpression} node */
	BinaryExpression(node) {
		let variableName = '';
		let literalValue = 0;
		let operator = '';

		if (
			// Match case: `index === -1`
			(node.left.type === 'Identifier')
			&& isNumberLiteral(node.right)
		) {
			variableName = node.left.name;
			literalValue = evaluateLiteralUnaryExpression(node.right);
			operator = node.operator;
		} else if (
			// Match case: `-1 === index`
			(node.right.type === 'Identifier')
			&& isNumberLiteral(node.left)
		) {
			variableName = node.right.name;
			literalValue = evaluateLiteralUnaryExpression(node.left);
			operator = reverseComparisonOperator(node.operator);
		}

		if (!variableName) {
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
					node,
					messageId: MESSAGE_ID,
					data: {
						value: context.sourceCode.getText(node),
						replacement,
					},
					fix: fixer => fixer.replaceText(node, replacement),
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
			description: 'Enforce consistent style when checking for element existence with `indexOf()` and `lastIndexOf()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
