/**
Check if two token arrays have the same token types and values.

@param {import('eslint').AST.Token[]} left
@param {import('eslint').AST.Token[]} right
@returns {boolean}
*/
export default function isSameTokens(left, right) {
	return left.length === right.length
		&& left.every((token, index) => token.type === right[index].type && token.value === right[index].value);
}
