const isNewTarget = node =>
	node.type === 'MetaProperty'
	&& node.meta.name === 'new'
	&& node.property.name === 'target';

const isArgumentsIdentifier = node =>
	node.type === 'Identifier'
	&& node.name === 'arguments';

const isDirectEvalCall = node =>
	node.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'eval';

const isUnsafeArrowConversionNode = node =>
	node.type === 'ThisExpression'
	|| node.type === 'Super'
	|| isNewTarget(node)
	|| isArgumentsIdentifier(node)
	|| isDirectEvalCall(node);

export default function hasUnsafeArrowConversionReference(node, visitorKeys) {
	if (!node) {
		return false;
	}

	if (isUnsafeArrowConversionNode(node)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const element of value) {
				if (hasUnsafeArrowConversionReference(element, visitorKeys)) {
					return true;
				}
			}
		} else if (hasUnsafeArrowConversionReference(value, visitorKeys)) {
			return true;
		}
	}

	return false;
}
