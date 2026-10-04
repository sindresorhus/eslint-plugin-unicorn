import {getParenthesizedRange, getParenthesizedText, isParenthesized} from './parentheses/parentheses.js';
import {wouldRemoveComments} from './comments.js';

/**
Get the text of `node`, wrapped in parentheses when `needsParentheses` is `true`.

Redundant parentheses around `node` are dropped, unless they contain comments. In that case, the parenthesized text is returned as is.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@param {boolean} needsParentheses
@returns {string}
*/
export default function getExpressionText(node, context, needsParentheses) {
	if (
		isParenthesized(node, context)
		&& wouldRemoveComments(context, getParenthesizedRange(node, context), [node])
	) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return needsParentheses ? `(${text})` : text;
}
