'use strict';

function isLiteral(node, value) {
	if (node?.type !== 'Literal') {
		return;
	}

	if (value === null) {
		return node.raw === 'null';
	}

	return node.value === value;
}

module.exports = isLiteral;
