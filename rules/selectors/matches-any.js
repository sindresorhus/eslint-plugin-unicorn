'use strict';

// Make selectors more readable
function matches(selectors) {
	return selectors.length === 1 ? selectors[0] : `:matches(${selectors.join(', ')})`;
}

module.exports = matches;
