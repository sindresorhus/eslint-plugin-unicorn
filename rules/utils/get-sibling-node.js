function getSiblingNode(node, sourceCode, offset) {
	const {parent} = node;
	const visitorKeys = sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];

		if (value !== node && Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index + offset];
			}
		}
	}
}

export const getPreviousNode = (node, sourceCode) => getSiblingNode(node, sourceCode, -1); 
export const getNextNode = (node, sourceCode) => getSiblingNode(node, sourceCode, 1); 
