import {getParenthesizedText, isParenthesized} from '../utils/parentheses/parentheses.js';
import needsSemicolon from '../utils/needs-semicolon.js';
import isStrongPrecedenceNode from '../utils/is-strong-precedence-node.js';
import shouldAddParenthesesToMemberExpressionObject from '../utils/should-add-parentheses-to-member-expression-object.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const isObjectOfMemberExpression = node =>
	node.parent.type === 'MemberExpression' && node.parent.object === node;

/**
Replace `node` with one of its inner `expression`s.

Parentheses are added when `expression` does not bind tightly enough to keep its meaning in `node`'s position, and a leading semicolon is added when needed to avoid an automatic-semicolon-insertion hazard.

@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.Node} node - The node to replace.
@param {ESTree.Node} expression - One of `node`'s inner expressions to replace it with.
@param {ESLint.Rule.RuleContext} context
@returns {ESLint.Rule.Fix}
*/
export default function replaceNodeWithExpression(fixer, node, expression, context) {
	let text = getParenthesizedText(expression, context);

	// A member-expression object has its own precedence subtleties (for example, a decimal integer literal like `1` needs parentheses before `.`), so defer to the dedicated check there.
	const needsParentheses = isObjectOfMemberExpression(node)
		? shouldAddParenthesesToMemberExpressionObject(expression, context)
		: !isStrongPrecedenceNode(expression);

	if (needsParentheses && !isParenthesized(expression, context)) {
		text = `(${text})`;
	}

	// A leading `{` can't start an expression statement (it is parsed as a block) and is invalid as a member-expression object, so it always needs parentheses, for example `Number({foo: 1}.length)` -> `({foo: 1}.length)`.
	if (text.startsWith('{')) {
		text = `(${text})`;
	}

	if (needsSemicolon(context.sourceCode.getTokenBefore(node), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(node, text);
}
