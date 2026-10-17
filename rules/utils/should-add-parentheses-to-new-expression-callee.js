import {isParenthesized} from './parentheses/parentheses.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

// Copied from https://github.com/eslint/eslint/blob/aa87329d919f569404ca573b439934552006572f/lib/rules/no-extra-parens.js#L448
/**
Check if a member expression contains a call expression, including through template tags and TypeScript wrappers.

@param {ASTNode} node - The `MemberExpression` node to evaluate.
@param {import('eslint').Rule.RuleContext} context
@returns {boolean} true if found, false if not.
*/
function doesMemberExpressionContainCallExpression(node, context) {
	let currentNode = node.object;

	while (!isParenthesized(currentNode, context)) {
		if (isTypeScriptExpressionWrapper(currentNode)) {
			currentNode = currentNode.expression;
			continue;
		}

		if (currentNode.type !== 'MemberExpression' && currentNode.type !== 'TaggedTemplateExpression') {
			return currentNode.type === 'CallExpression';
		}

		currentNode = currentNode.type === 'MemberExpression' ? currentNode.object : currentNode.tag;
	}

	return false;
}

/**
Check if parentheses should be added to a `node` when it's used as `callee` of `NewExpression`.

@param {Node} node - The AST node to check.
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function shouldAddParenthesesToNewExpressionCallee(node, context) {
	return node.type === 'MemberExpression' && doesMemberExpressionContainCallExpression(node, context);
}
