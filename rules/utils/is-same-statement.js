import isSameTokens from './is-same-tokens.js';
import getVisitorChildNodes from './get-visitor-child-nodes.js';

// Tokens of a statement, ignoring an optional trailing semicolon.
const getStatementTokens = (node, context) => {
	const tokens = context.sourceCode.getTokens(node);
	const lastToken = tokens.at(-1);

	return lastToken?.type === 'Punctuator' && lastToken.value === ';' ? tokens.slice(0, -1) : tokens;
};

function hasSameStructure(left, right, visitorKeys) {
	if (left.type !== right.type || left.directive !== right.directive) {
		return false;
	}

	const leftChildren = [...getVisitorChildNodes(left, visitorKeys)];
	const rightChildren = [...getVisitorChildNodes(right, visitorKeys)];
	return leftChildren.length === rightChildren.length
		&& leftChildren.every((child, index) => hasSameStructure(child, rightChildren[index], visitorKeys));
}

/**
Check if two statements have the same tokens and AST structure, ignoring comments, formatting, and a trailing semicolon. Statements without other tokens (empty statements, `;`) are never the same.

@param {import('estree').Statement} left
@param {import('estree').Statement} right
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isSameStatement(left, right, context) {
	const leftTokens = getStatementTokens(left, context);
	const rightTokens = getStatementTokens(right, context);

	return leftTokens.length > 0
		&& isSameTokens(leftTokens, rightTokens)
		&& hasSameStructure(left, right, context.sourceCode.visitorKeys);
}
