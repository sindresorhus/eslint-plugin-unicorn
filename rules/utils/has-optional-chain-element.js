'use strict';

const isChainElement = node => node.type === 'MemberExpression' || node.type === 'CallExpression';

function hasOptionalChainElement(node) {
	if (!isChainElement(node)) {
		return false;
	}

	if (node.optional) {
		return true;
	}

	if (node.type === 'MemberExpression') {
		return hasOptionalChainElement(node.object);
	}

	return false;
}

module.exports = hasOptionalChainElement;
