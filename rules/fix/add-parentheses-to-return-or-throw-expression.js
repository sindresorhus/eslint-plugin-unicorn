import {isSemicolonToken} from '@eslint-community/eslint-utils';
import {getTokenStore} from '../utils/index.js';

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
export default function * addParenthesesToReturnOrThrowExpression(fixer, node, context) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const tokenStore = getTokenStore(context, node);
	const returnOrThrowToken = tokenStore.getFirstToken(node);
	yield fixer.insertTextAfter(returnOrThrowToken, ' (');
	const lastToken = tokenStore.getLastToken(node);
	if (!isSemicolonToken(lastToken)) {
		yield fixer.insertTextAfter(node, ')');
		return;
	}

	yield fixer.insertTextBefore(lastToken, ')');
}
