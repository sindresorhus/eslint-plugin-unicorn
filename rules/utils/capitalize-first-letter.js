'use strict';

/**
Capitalize the first letter of a string

@param {string} str
@returns {string}
*/
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = capitalizeFirstLetter;
