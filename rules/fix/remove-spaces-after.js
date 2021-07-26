'use strict';

function removeSpacesAfter(indexOrNode, sourceCode, fixer) {
	let index = indexOrNode;
	if (typeof indexOrNode === 'object' && Array.isArray(indexOrNode.range)) {
		index = indexOrNode.range[1];
	}

	const textAfter = sourceCode.text.slice(index);
	const [leadingSpaces] = textAfter.match(/^\s*/);
	return fixer.removeRange([index, index + leadingSpaces.length]);
}

module.exports = removeSpacesAfter;
