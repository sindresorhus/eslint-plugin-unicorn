import getExpressionText from './get-expression-text.js';

const isInsideForStatementInitializer = node => {
	for (let current = node; current.parent; current = current.parent) {
		if (current.parent.type === 'ForStatement' && current.parent.init === current) {
			return true;
		}
	}

	return false;
};

const hasInOperator = (node, context) =>
	context.sourceCode.getTokens(node).some(token => token.type === 'Keyword' && token.value === 'in');

/**
Get the text of an expression so it can be used as the body of a concise arrow function (`() => body`).

The text is wrapped in parentheses when it would start with `{` (for example `{a: 1}`, `{a: x}.a`, `{} + x`, or `{} as Foo`), when it is a sequence expression, when it is an assignment (to not trigger `no-return-assign`), or when it contains the `in` operator inside a `for` statement initializer. Redundant parentheses around `node` are dropped, unless they contain comments.

@param {import('estree').Expression} node
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export default function getConciseArrowBodyText(node, context) {
	const needsParentheses = context.sourceCode.getText(node).startsWith('{')
		|| node.type === 'SequenceExpression'
		|| node.type === 'AssignmentExpression'
		|| (isInsideForStatementInitializer(node) && hasInOperator(node, context));

	return getExpressionText(node, context, needsParentheses);
}
