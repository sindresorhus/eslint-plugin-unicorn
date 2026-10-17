import {isParenthesized} from './parentheses/parentheses.js';
import getTokenStore from './get-token-store.js';

/**
Check whether the raw text of `node` starts with a token that can be parsed as a block or declaration.
*/
export function startsWithDeclarationLikeToken(node, context) {
	const tokenStore = getTokenStore(context, node);
	const firstToken = tokenStore.getFirstToken(node);
	return (firstToken.type === 'Punctuator' && firstToken.value === '{')
		|| (firstToken.type === 'Keyword' && (firstToken.value === 'class' || firstToken.value === 'function'))
		|| (firstToken.value === 'async' && tokenStore.getTokenAfter(firstToken)?.value === 'function');
}

/**
Check if parentheses should be added to a `node` when it's used as an `expression` of `ExpressionStatement`.

An expression statement cannot start with `{`, `class`, `function`, or `async function`, it would be parsed as a block or a declaration. Only the left-most token matters, so `class {}.foo` and `function () {} || bar` need parentheses too, while `(class {}).foo` does not.

@param {Node} node - The AST node to check.
@param {RuleContext} context - The ESLint rule context object.
@returns {boolean}
*/
export default function shouldAddParenthesesToExpressionStatementExpression(node, context) {
	return !isParenthesized(node, context) && startsWithDeclarationLikeToken(node, context);
}

const isSvelteTextInterpolation = node =>
	node?.type === 'SvelteMustacheTag'
	&& node.kind === 'text'
	&& node.parent.type !== 'SvelteAttribute'
	&& node.parent.type !== 'SvelteStyleDirective';

/**
Check whether moving an expression to the replacement position would expose a block or declaration prefix, or a regular expression parsed as a Svelte closing tag.
*/
export function shouldAddParenthesesToExpressionStart(expression, context, replacementNode = expression) {
	const {sourceCode} = context;
	const firstToken = getTokenStore(context, expression).getFirstToken(expression);
	const startsWithRegExp = firstToken.type === 'RegularExpression';
	if (!startsWithRegExp && !startsWithDeclarationLikeToken(expression, context)) {
		return false;
	}

	for (let node = replacementNode; node; node = node.parent) {
		if (isParenthesized(node, context)) {
			return false;
		}

		const {parent} = node;
		if (startsWithRegExp && isSvelteTextInterpolation(parent)) {
			return sourceCode.getCommentsBefore(node).length === 0;
		}

		if (parent?.type === 'ArrowFunctionExpression' && parent.body === node) {
			return firstToken.value === '{';
		}

		if (parent?.type === 'ExportDefaultDeclaration' && parent.declaration === node) {
			return !startsWithRegExp && firstToken.value !== '{';
		}

		if (node.type.endsWith('Statement')) {
			return !startsWithRegExp;
		}

		if (!parent || sourceCode.getRange(parent)[0] !== sourceCode.getRange(node)[0]) {
			return false;
		}
	}

	return false;
}
