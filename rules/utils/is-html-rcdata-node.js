// The content of these HTML elements is text, not markup, but `@html-eslint` still builds `Tag` nodes for anything that looks like a tag inside them. https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
const rcdataElementNames = new Set([
	'textarea',
	'title',
]);

/**
Check if a node is inside the text content of an RCDATA element, rather than in real markup.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function isHtmlRcdataNode(node) {
	for (let {parent} = node; parent; parent = parent.parent) {
		if (parent.type === 'Tag' && rcdataElementNames.has(parent.name?.toLowerCase())) {
			return true;
		}
	}

	return false;
}
