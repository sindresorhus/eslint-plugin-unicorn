'use strict';

module.exports = (node1, node2) =>
	node1 &&
	node2 &&
	(
		node1 === node2 ||
		// In `babel-eslint` parent.key is not reference of identifier, #444
		// issue https://github.com/babel/babel-eslint/issues/809
		(node1.range[0] === node2.range[0] && node1.range[1] === node2.range[1])
	);
