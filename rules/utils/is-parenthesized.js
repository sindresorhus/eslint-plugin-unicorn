'use strict';

const isParenthesized = (node, sourceCode) => {
	const previousToken = sourceCode.getTokenBefore(node);
	const nextToken = sourceCode.getTokenAfter(node);

	return (
		Boolean(previousToken && nextToken) &&
		previousToken.value === '(' &&
		previousToken.end <= node.range[0] &&
		nextToken.value === ')' &&
		nextToken.start >= node.range[1]
	);
};

module.exports = isParenthesized;
