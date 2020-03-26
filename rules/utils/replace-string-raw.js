'use strict';

module.exports = (fixer, node, replacement) =>
	fixer.replaceTextRange(
		// Ignore quotes and backticks
		[
			node.range[0] + 1,
			node.range[1] - 1
		],
		replacement
	);
