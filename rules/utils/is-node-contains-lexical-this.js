import getVisitorChildNodes from './get-visitor-child-nodes.js';

/**
Check whether a node subtree contains a lexical `this`, `super`, or `new.target`, the three bindings an arrow function inherits from its enclosing function.

This is parser-agnostic and intentionally does not use `scope.thisFound`, because that flag is inconsistent across supported parsers.
*/
const isNodeContainsLexicalThis = (node, visitorKeys) => {
	if (node.type === 'ThisExpression') {
		return true;
	}

	// `super` and `new.target` are lexical to the enclosing method/function, like `this`
	if (node.type === 'Super') {
		return true;
	}

	if (node.type === 'MetaProperty' && node.meta?.name === 'new' && node.property?.name === 'target') {
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

	return getVisitorChildNodes(node, visitorKeys).some(child => isNodeContainsLexicalThis(child, visitorKeys));
};

export default isNodeContainsLexicalThis;
