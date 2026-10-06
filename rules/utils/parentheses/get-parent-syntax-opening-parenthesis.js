import {isOpeningParenToken as isOpeningParenthesisToken} from '@eslint-community/eslint-utils';
import getTokenStore from '../get-token-store.js';

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
export default function getParentSyntaxOpeningParenthesis(node, context) {
	const {parent} = node;
	const tokenStore = getTokenStore(context, node);

	switch (parent.type) {
		case 'CallExpression':
		case 'NewExpression': {
			if (parent.arguments.length === 1 && parent.arguments[0] === node) {
				return tokenStore.getTokenAfter(
					parent.typeArguments ?? parent.callee,
					isOpeningParenthesisToken,
				);
			}

			return;
		}

		case 'DoWhileStatement': {
			if (parent.test === node) {
				return tokenStore.getTokenAfter(
					parent.body,
					isOpeningParenthesisToken,
				);
			}

			return;
		}

		case 'IfStatement':
		case 'WhileStatement': {
			if (parent.test === node) {
				return tokenStore.getFirstToken(parent, 1);
			}

			return;
		}

		case 'ImportExpression': {
			if (parent.source === node) {
				return tokenStore.getFirstToken(parent, 1);
			}

			return;
		}

		// `switch (node) {}` and `with (node) {}`. Their other children, `SwitchCase` and the body statement, never directly follow an opening parenthesis.
		case 'SwitchStatement':
		case 'WithStatement': {
			return tokenStore.getFirstToken(parent, 1);
		}

		// No default
	}
}
