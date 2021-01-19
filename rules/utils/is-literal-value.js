'use strict';
module.exports = (node, value) => {
	if (!node || node.type !== 'Literal') {
		return false;
	}

	if (value === null) {
		return node.raw === 'null';
	}

	return node.value === value;
};
