import isSameTokens from './is-same-tokens.js';

// Tokens of a statement, ignoring a trailing semicolon so ASI differences do not matter.
const getStatementTokens = (node, context) => {
	const tokens = context.sourceCode.getTokens(node);
	const lastToken = tokens.at(-1);

	return lastToken?.type === 'Punctuator' && lastToken.value === ';' ? tokens.slice(0, -1) : tokens;
};

/**
Check if two statements have the same tokens, ignoring comments, formatting, and a trailing semicolon. Statements without other tokens (empty statements, `;`) are never the same.

@param {import('estree').Statement} left
@param {import('estree').Statement} right
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isSameStatement(left, right, context) {
	const leftTokens = getStatementTokens(left, context);
	const rightTokens = getStatementTokens(right, context);

	return leftTokens.length > 0 && isSameTokens(leftTokens, rightTokens);
}
