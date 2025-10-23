import {getParenthesizedRange} from '../utils/parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const isProblematicToken = ({type, value}) => (
	(type === 'Keyword' && /^[a-z]*$/.test(value))
	// ForOfStatement
	|| (type === 'Identifier' && value === 'of')
	// AwaitExpression
	|| (type === 'Identifier' && value === 'await')
);

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
*/
export default function * fixSpaceAroundKeyword(fixer, node, context) {
	const {sourceCode} = context;
	const range = getParenthesizedRange(node, context);
	const tokenBefore = sourceCode.getTokenBefore({range}, {includeComments: true});

	if (
		tokenBefore
		&& range[0] === sourceCode.getRange(tokenBefore)[1]
		&& isProblematicToken(tokenBefore)
	) {
		yield fixer.insertTextAfter(tokenBefore, ' ');
	}

	const tokenAfter = sourceCode.getTokenAfter({range}, {includeComments: true});

	if (
		tokenAfter
		&& range[1] === sourceCode.getRange(tokenAfter)[0]
		&& isProblematicToken(tokenAfter)
	) {
		yield fixer.insertTextBefore(tokenAfter, ' ');
	}
}
