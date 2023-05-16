'use strict';

const isSameIdentifier = (nodeA, nodeB) =>
	nodeA.type === 'Identifier'
	&& nodeB.type === 'Identifier'
	&& nodeA.name === nodeB.name;

module.exports = isSameIdentifier;
