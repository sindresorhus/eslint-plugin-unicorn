/**
Check if a node starts the expression statement it is in, for example `foo` in `foo.bar();`. A replacement of such a node that starts with `(`, `[`, or `` ` `` may need a leading semicolon (see `needsSemicolon`).

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isFirstTokenOfExpressionStatement(node, context) {
	const {sourceCode} = context;

	for (let current = node.parent; current; current = current.parent) {
		if (current.type === 'ExpressionStatement') {
			return sourceCode.getRange(sourceCode.getFirstToken(current))[0] === sourceCode.getRange(sourceCode.getFirstToken(node))[0];
		}
	}

	return false;
}
