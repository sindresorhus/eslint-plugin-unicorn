'use strict';

const {isNotOpeningParenToken, isNotClosingParenToken} = require('eslint-utils');

/**
Check if parentheses needs to be added to a `node` when it's used as an `object` of `MemberExpression`.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object to get text.
@returns {boolean}
*/
function needAddParenthesesToMemberExpressionObject(node, sourceCode) {
	switch (node.type) {
		// This is not a full list. Some other nodes like `FunctionDeclaration` don't need parentheses,
		// but it's not possible to be in the place we are checking at this point.
		case 'Identifier':
		case 'MemberExpression':
		case 'CallExpression':
		case 'ChainExpression':
		case 'TemplateLiteral':
			return false;

		case 'NewExpression': {
			// `new Foo` and `new (Foo)` need add `()`
			if (node.arguments.length === 0) {
				const [maybeOpeningParenthesisToken, maybeClosingParenthesisToken] = sourceCode.getLastTokens(node, 2);
				if (isNotOpeningParenToken(maybeOpeningParenthesisToken) || isNotClosingParenToken(maybeClosingParenthesisToken)) {
					return true;
				}
			}

			return false;
		}

		case 'Literal': {
			/* istanbul ignore next */
			if (typeof node.value === 'number' && /^\d+$/.test(node.raw)) {
				return true;
			}

			return false;
		}

		default:
			return true;
	}
}

module.exports = needAddParenthesesToMemberExpressionObject;
