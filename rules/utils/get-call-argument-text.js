import getExpressionText from './get-expression-text.js';

/**
Get the text of `node` so it can be used as a single argument of a call (`foo(argument)`). A sequence expression is wrapped in parentheses, so it stays one argument.

Redundant parentheses around `node` are dropped, unless they contain comments.

@param {import('estree').Expression} node
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export default function getCallArgumentText(node, context) {
	return getExpressionText(node, context, node.type === 'SequenceExpression');
}
