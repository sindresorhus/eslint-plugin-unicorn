export default function replaceStringLiteral(fixer, node, text) {
	return fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], text);
}
