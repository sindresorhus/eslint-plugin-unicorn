'use strict';
const {findVariable} = require('eslint-utils');

const getReferences = (scope, nodeOrName) => {
	const {references = []} = findVariable(scope, nodeOrName) || {};
	return references;
};

/**
Check if `this`, `arguments`, or `id` of function is used inside it self.

@param {Node} node - The function node.
@param {Scope} [scope] - The scope of the function node.
@returns {boolean}
*/
function isFunctionSelfUsedInside(functionNode, functionScope) {
	/* istanbul ignore next */
	if (functionScope.block !== functionNode) {
		throw new Error('"functionScope" should be the scope of "functionNode".')
	}

	const {type, id} = functionNode;

	if (type === 'ArrowFunctionExpression') {
		return false;
	}

	if (functionScope.thisFound) {
		return true;
	}

	if (getReferences(functionScope, 'arguments').some(reference => reference.from === functionScope)) {
		return true;
	}

	if (id && getReferences(functionScope, id).length > 0) {
		return true;
	}

	return false;
}

module.exports = isFunctionSelfUsedInside;
