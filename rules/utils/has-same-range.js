'use strict';

const hasSameRange = (node1, node2) =>
	node1
	&& node2
	&& node1.range[0] === node2.range[0]
	&& node1.range[1] === node2.range[1];
module.exports = hasSameRange;
