'use strict';

/**
Check if need add parentheses to node, when it's used as `object` of `MemberExpression`.

@param {Node} node The AST node to check.
@param {SourceCode} sourceCode The source code object to get text.
@returns {boolean}
*/

function needAddParenthesesToMemberExpressionObject(node, sourceCode) {
	switch (node.type) {
		// This is not full list, some other node like `FunctionDeclaration` don't need parentheses,
		// but not possible to be in the place we are checking at this point
		case 'Identifier':
		case 'MemberExpression':
		case 'CallExpression':
		case 'ChainExpression':
		case 'TemplateLiteral':
			return false;

		case 'NewExpression': {
			// `new Foo.bar` is different with `new Foo().bar`
			return !sourceCode.getText(node).endsWith(')');
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
