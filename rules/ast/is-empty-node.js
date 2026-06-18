export default function isEmptyNode(node, additionalEmpty) {
	const {type} = node;

	if (type === 'BlockStatement') {
		return node.body.every(currentNode => isEmptyNode(currentNode, additionalEmpty));
	}

	if (type === 'EmptyStatement') {
		return true;
	}

	return Boolean(additionalEmpty?.(node));
}
