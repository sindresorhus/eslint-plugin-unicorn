import isNewExpressionWithParentheses from './is-new-expression-with-parentheses.js';
import {isDecimalIntegerNode} from './numeric.js';
/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Check if parentheses should to be added to a `node` when it's used as an `object` of `MemberExpression`.

@param {ESTree.Node} node - The AST node to check.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {boolean}
*/
export default function shouldAddParenthesesToMemberExpressionObject(node, context) {
	switch (node.type) {
		// This is not a full list. Some other nodes like `FunctionDeclaration` don't need parentheses,
		// but it's not possible to be in the place we are checking at this point.
		case 'Identifier':
		case 'MemberExpression':
		case 'CallExpression':
		case 'ChainExpression':
		case 'TemplateLiteral':
		case 'ThisExpression':
		case 'ArrayExpression':
		case 'FunctionExpression': {
			return false;
		}

		case 'NewExpression': {
			return !isNewExpressionWithParentheses(node, context);
		}

		case 'Literal': {
			/* c8 ignore next */
			if (isDecimalIntegerNode(node)) {
				return true;
			}

			return false;
		}

		default: {
			return true;
		}
	}
}
