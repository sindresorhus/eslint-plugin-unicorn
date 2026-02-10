import {isOpeningParenToken, isClosingParenToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Determine if a constructor function is newed-up with parens.

@param {ESTree.NewExpression} node - The `NewExpression` node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {boolean} True if the constructor is called with parens.

Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/no-extra-parens.js#L252
*/
export default function isNewExpressionWithParentheses(node, context) {
	if (node.arguments.length > 0) {
		return true;
	}

	const {sourceCode} = context;
	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	// The expression should end with its own parens, for example, `new new Foo()` is not a new expression with parens.
	return isOpeningParenToken(penultimateToken)
		&& isClosingParenToken(lastToken)
		&& sourceCode.getRange(node.callee)[1] < sourceCode.getRange(node)[1];
}
