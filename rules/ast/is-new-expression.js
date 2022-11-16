'use strict';

function isNewExpression(node, options) {
	if (node?.type !== 'NewExpression') {
		return false;
	}

	const {
		name,
	} = {
		...options,
	};

	if (name) {
		return node.callee.type === 'Identifier' && node.callee.name === name;
	}

	return true;
}

module.exports = isNewExpression;
