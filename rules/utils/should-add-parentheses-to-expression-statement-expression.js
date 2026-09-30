import {isParenthesized} from './parentheses/parentheses.js';

/**
Check if parentheses should be added to a `node` when it's used as an `expression` of `ExpressionStatement`.

An expression statement cannot start with `{`, `class`, `function`, or `async function`, it would be parsed as a block or a declaration. Only the left-most token matters, so `class {}.foo` and `function () {} || bar` need parentheses too, while `(class {}).foo` does not.

@param {Node} node - The AST node to check.
@param {RuleContext} context - The ESLint rule context object.
@returns {boolean}
*/
export default function shouldAddParenthesesToExpressionStatementExpression(node, context) {
	if (isParenthesized(node, context)) {
		return false;
	}

	const {sourceCode} = context;
	const firstToken = sourceCode.getFirstToken(node);
	return (firstToken.type === 'Punctuator' && firstToken.value === '{')
		|| (firstToken.type === 'Keyword' && (firstToken.value === 'class' || firstToken.value === 'function'))
		|| (firstToken.value === 'async' && sourceCode.getTokenAfter(firstToken)?.value === 'function');
}
