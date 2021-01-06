'use strict';

const {isOpeningParenToken, isClosingParenToken} = require('eslint-utils');

// Determine whether this node is a decimal integer literal.
// Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/utils/ast-utils.js#L1237
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
const isDecimalInteger = node =>
	node.type === 'Literal' &&
	typeof node.value === 'number' &&
	DECIMAL_INTEGER_PATTERN.test(node.raw);

/**
Determine if a constructor function is newed-up with parens.

@param {Node} node - The `NewExpression` node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean} True if the constructor is called with parens.

Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/no-extra-parens.js#L252
*/
function isNewExpressionWithParentheses(node, sourceCode) {
	if (node.arguments.length > 0) {
		return true;
	}

	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	// The expression should end with its own parens, for example, `new new Foo()` is not a new expression with parens.
	return isOpeningParenToken(penultimateToken) &&
		isClosingParenToken(lastToken) &&
		node.callee.range[1] < node.range[1];
}

/**
Check if parentheses should to be added to a `node` when it's used as an `object` of `MemberExpression`.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
function shouldAddParenthesesToMemberExpressionObject(node, sourceCode) {
	switch (node.type) {
		// This is not a full list. Some other nodes like `FunctionDeclaration` don't need parentheses,
		// but it's not possible to be in the place we are checking at this point.
		case 'Identifier':
		case 'MemberExpression':
		case 'CallExpression':
		case 'ChainExpression':
		case 'TemplateLiteral':
			return false;
		case 'NewExpression':
			return !isNewExpressionWithParentheses(node, sourceCode);
		case 'Literal': {
			/* istanbul ignore next */
			if (isDecimalInteger(node)) {
				return true;
			}

			return false;
		}

		default:
			return true;
	}
}

module.exports = shouldAddParenthesesToMemberExpressionObject;
