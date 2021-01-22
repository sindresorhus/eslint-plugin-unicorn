'use strict';

// Replace `StringLiteral` or `TemplateLiteral` node with raw text
module.exports = (fixer, {range}, raw) =>
	fixer.replaceTextRange(
		// Ignore quotes and backticks
		[
			range[0] + 1,
			range[1] - 1
		],
		raw
	);
