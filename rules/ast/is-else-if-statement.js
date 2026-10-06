/**
Check if an `if` statement is the `else` branch of another `if` statement, for example the second `if` in `if (a) {} else if (b) {}`.

@param {import('estree').IfStatement} node
@returns {boolean}
*/
export default function isElseIfStatement(node) {
	return node.parent?.type === 'IfStatement'
		&& node.parent.alternate === node;
}
