import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

// Copied from https://github.com/eslint/eslint/blob/aa87329d919f569404ca573b439934552006572f/lib/rules/no-extra-parens.js#L448
/**
Check if a member expression contains a call expression, including through template tags and TypeScript wrappers.

@param {ASTNode} node - The `MemberExpression` node to evaluate.
@returns {boolean} true if found, false if not.
*/
function doesMemberExpressionContainCallExpression(node) {
	let currentNode = unwrapTypeScriptExpression(node.object);

	while (currentNode.type === 'MemberExpression' || currentNode.type === 'TaggedTemplateExpression') {
		currentNode = unwrapTypeScriptExpression(currentNode.type === 'MemberExpression' ? currentNode.object : currentNode.tag);
	}

	return currentNode.type === 'CallExpression';
}

/**
Check if parentheses should be added to a `node` when it's used as `callee` of `NewExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToNewExpressionCallee(node) {
	return node.type === 'MemberExpression' && doesMemberExpressionContainCallExpression(node);
}
