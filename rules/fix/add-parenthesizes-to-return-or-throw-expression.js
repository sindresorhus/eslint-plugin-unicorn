import {isSemicolonToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.ReturnStatement | ESTree.ThrowStatement} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function * addParenthesizesToReturnOrThrowExpression(fixer, node, context) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const {sourceCode} = context;
	const returnOrThrowToken = sourceCode.getFirstToken(node);
	yield fixer.insertTextAfter(returnOrThrowToken, ' (');
	const lastToken = sourceCode.getLastToken(node);
	if (!isSemicolonToken(lastToken)) {
		yield fixer.insertTextAfter(node, ')');
		return;
	}

	yield fixer.insertTextBefore(lastToken, ')');
}
