/**
Check whether a node subtree contains lexical `this`.

This is parser-agnostic and intentionally does not use `scope.thisFound`, because that flag is inconsistent across supported parsers.
*/
const isNodeContainsLexicalThis = (node, visitorKeys) => {
	if (node.type === 'ThisExpression') {
		return true;
	}

	if (
		node.type === 'FunctionDeclaration'
		|| node.type === 'FunctionExpression'
	) {
		// `this` inside non-arrow functions is rebound and does not affect outer arrows.
		return false;
	}

	if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
		// Class bodies create their own `this`, but computed keys/superclass are evaluated in outer scope.
		if (node.superClass && isNodeContainsLexicalThis(node.superClass, visitorKeys)) {
			return true;
		}

		for (const classElement of node.body.body) {
			if (classElement.computed && isNodeContainsLexicalThis(classElement.key, visitorKeys)) {
				return true;
			}
		}

		return false;
	}

	const keys = visitorKeys[node.type];

	if (!keys) {
		return false;
	}

	for (const key of keys) {
		const value = node[key];

		if (!value) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const childNode of value) {
				if (childNode && isNodeContainsLexicalThis(childNode, visitorKeys)) {
					return true;
				}
			}

			continue;
		}

		if (isNodeContainsLexicalThis(value, visitorKeys)) {
			return true;
		}
	}

	return false;
};

export default isNodeContainsLexicalThis;
