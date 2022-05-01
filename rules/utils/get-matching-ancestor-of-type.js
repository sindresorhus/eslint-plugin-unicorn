'use strict';

// The third argument is a condition function, as one passed to `Array#filter()`
// Helpful if nearest node of type also needs to have some other property
const getMatchingAncestorOfType = (node, type, testFunction = () => true) => {
	let current = node;
	while (current) {
		if (current.type === type && testFunction(current)) {
			return current;
		}

		current = current.parent;
	}
};

module.exports = getMatchingAncestorOfType;
