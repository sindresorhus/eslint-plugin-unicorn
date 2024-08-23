'use strict';
const {isMethodCall} = require('./ast/index.js');

const MESSAGE_ID = 'consistent-indexof-check';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const comparisonMap = {
	'<': '>',
	'<=': '>=',
	'>': '<',
	'>=': '<=',
};

/**
Evaluate the value of a UnaryExpression node which contain a Literal node.
Make sure to call this function only when you are sure that the node is a UnaryExpression node or Literal node.

@param {import('estree').Node} node
@returns
*/
function evaluateLiteralUnaryExpression(node) {
	// Base case: if the argument is a numeric literal, return its value directly
	if (node.type === 'Literal') {
		return node.value;
	}

	// If the argument is another UnaryExpression, recursively evaluate its value
	if (node.type === 'UnaryExpression') {
		const argumentValue = evaluateLiteralUnaryExpression(node.argument);

		switch (node.operator) {
			case '-': {
				return -argumentValue;
			}

			case '+': {
				return Number(argumentValue);
			}

			case '~': {
				return ~argumentValue; // eslint-disable-line no-bitwise
			}

			default:
		}
	}
}

/**
Determine the appropriate replacement based on the operator and value.

@param {string} operator
@param {number} value
@param {string} variableName
@returns {string | undefined}
*/
function getReplacement(operator, value, variableName) {
	if ((operator === '<' && value <= 0) || (operator === '<=' && value <= -1)) {
		return `${variableName} === -1`;
	}

	if ((operator === '>' && value === -1) || (operator === '>=' && value === 0)) {
		return `${variableName} !== -1`;
	}
}

/**
Check if the node is a number literal or a unary expression resolving to a number.

@param {import('estree').Node} node
@returns {node is import('estree').Literal}
*/
function isNumberLiteral(node) {
	if (node.type === 'UnaryExpression' && ['-', '+', '~'].includes(node.operator)) {
		return isNumberLiteral(node.argument);
	}

	return node.type === 'Literal' && typeof node.value === 'number';
}

/**
Find and process references to a given identifier.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Identifier} identifierNode
@returns
*/
function findAndProcessReferences(context, identifierNode) {
	const variable = context.sourceCode.getDeclaredVariables(identifierNode.parent).find(variable => variable.name === identifierNode.name);

	for (const reference of variable.references) {
		if (reference.identifier === identifierNode) {
			continue;
		}

		const {identifier} = reference;
		/** @type {{parent: import('estree').Node}} */
		const {parent} = identifier;

		// Check if the identifier is used in a binary expression
		if (parent.type === 'BinaryExpression' && [parent.left, parent.right].includes(identifier)) {
			const [literal, operator] = [parent.left, parent.right].some(n => isNumberLiteral(n))
				? (parent.left === identifier
					? [evaluateLiteralUnaryExpression(parent.right), parent.operator] // Index === -1
					: [evaluateLiteralUnaryExpression(parent.left), comparisonMap[parent.operator]]) // -1 === index
				: [];

			const replacement = getReplacement(
				operator,
				literal,
				identifier.name,
			);

			if (!replacement) {
				continue;
			}

			context.report({
				node: parent,
				messageId: MESSAGE_ID,
				data: {value: context.sourceCode.getText(parent), replacement},
				fix: fixer => fixer.replaceText(parent, replacement),
			});
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').CallExpression} node */
	CallExpression(node) {
		if (!isMethodCall(node, {methods: ['indexOf', 'lastIndexOf', 'findIndex', 'findLastIndex']})) {
			return;
		}

		/** @type {{parent: import('estree').Node}} */
		const {parent} = node;

		if (parent.type === 'VariableDeclarator' && parent.parent.kind === 'const' && parent.id.type === 'Identifier') {
			findAndProcessReferences(context, parent.id);
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
