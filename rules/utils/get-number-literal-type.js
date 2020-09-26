'use strict';
/**
 * Return the type of the number in the node
 * @param {Node} node - The node to check. Its type must be "Literal", and its value must be a number.
 * @returns {undefined|"bigint"|"hexadecimal"|"binary"|"octal"|"number"}
 */
function getNumberLiteralType(node) {
	if (!node || node.type !== 'Literal' || !(['number', 'bigint'].includes(typeof node.value) || node.bigint)) {
		return;
	}

	if (node.raw.startsWith('0x')) {
		return 'hexadecimal';
	}

	if (node.raw.startsWith('0b')) {
		return 'binary';
	}

	if (node.raw.startsWith('0o')) {
		return 'octal';
	}

	if (node.bigint) {
		return 'bigint';
	}

	if (typeof node.value === 'number') {
		return 'number';
	}
}

module.exports = getNumberLiteralType;
