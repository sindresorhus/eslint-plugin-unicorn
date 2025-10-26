import {isOpeningParenToken as isOpeningParenthesisToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
@import {
	OpeningParenToken as OpeningParenthesisToken,
} from '@eslint-community/eslint-utils';
*/

/**
Get the opening parenthesis of the parent node syntax if it exists.
E.g., `if (a) {}` then the `(`.
@param {ESTree.Node} node The AST node to check.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {OpeningParenthesisToken | void} The left parenthesis of the parent node syntax
*/
function getParentSyntaxOpeningParenthesis(node, context) {
	const {parent} = node;

	switch (parent.type) {
		case 'CallExpression':
		case 'NewExpression': {
			if (parent.arguments.length === 1 && parent.arguments[0] === node) {
				return context.sourceCode.getTokenAfter(
					parent.typeArguments ?? parent.callee,
					isOpeningParenthesisToken,
				);
			}

			return;
		}

		case 'DoWhileStatement': {
			if (parent.test === node) {
				return context.sourceCode.getTokenAfter(
					parent.body,
					isOpeningParenthesisToken,
				);
			}

			return;
		}

		case 'IfStatement':
		case 'WhileStatement': {
			if (parent.test === node) {
				return context.sourceCode.getFirstToken(parent, 1);
			}

			return;
		}

		case 'ImportExpression': {
			if (parent.source === node) {
				return context.sourceCode.getFirstToken(parent, 1);
			}

			return;
		}

		case 'SwitchStatement': {
			if (parent.discriminant === node) {
				return context.sourceCode.getFirstToken(parent, 1);
			}

			return;
		}

		case 'WithStatement': {
			if (parent.object === node) {
				return context.sourceCode.getFirstToken(parent, 1);
			}
		}

		// No default
	}
}

export default getParentSyntaxOpeningParenthesis;
