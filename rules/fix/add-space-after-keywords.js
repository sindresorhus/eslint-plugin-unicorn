'use strict';

function * addSpaceAfterReturnKeyword(fixer, node, sourceCode) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const keyword = sourceCode.getFirstToken(node);
	const textAfter = sourceCode.text.charAt(keyword.range[1] + 1);

	if (textAfter === ' ') {
		return;
	}

	yield fixer.insertTextAfter(keyword, ' ');
}

module.exports = addSpaceAfterReturnKeyword;
