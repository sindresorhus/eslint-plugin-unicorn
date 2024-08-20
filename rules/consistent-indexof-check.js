'use strict';
const evaluateLiteralUnaryExpression = require('./utils/evaluate-literal-unaryexpression.js');
const resolveVariableName = require('./utils/resolve-variable-name.js');

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
Check if the node is a call expression of `indexOf` or `lastIndexOf` method.

@param {import('estree').Node} node
@returns {node is import('estree').CallExpression}
*/
function isIndexOfCallExpression(node) {
	return (
		node?.type === 'CallExpression'
		&& node.callee?.type === 'MemberExpression'
		&& ['indexOf', 'lastIndexOf'].includes(node.callee.property.name)
		&& node.arguments.length === 1
	);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').BinaryExpression} node */
	BinaryExpression(node) {
		const [identifier, literal, operator]
			= [node.left, node.right].some(n => isNumberLiteral(n)) && [node.left, node.right].some(n => n.type === 'Identifier')
				? (node.left.type === 'Identifier'
					? [node.left.name, evaluateLiteralUnaryExpression(node.right), node.operator] // Index === -1
					: [node.right.name, evaluateLiteralUnaryExpression(node.left), comparisonMap[node.operator]]) // -1 === index
				: [];

		if (!identifier) {
			return;
		}

		const replacement = getReplacement(operator, literal, identifier);

		if (!replacement) {
			return;
		}

		const variableFound = resolveVariableName(identifier, context.sourceCode.getScope(node));

		if (!variableFound) {
			return;
		}

		for (const {type, node: initNode} of variableFound.defs) {
			if (type === 'Variable' && isIndexOfCallExpression(initNode.init)) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					data: {value: context.sourceCode.getText(node), replacement},
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
