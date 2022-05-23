'use strict';

/**
Lowercase the first letter of a given string

@param string
@returns string
*/
function lowerFirst(string) {
	return string ? string.charAt(0).toLowerCase() + string.slice(1) : '';
}

/**
Uppercase the first letter of a given string

@param string
@returns string
*/
function upperFirst(string) {
	return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
}

module.exports = {
	lowerFirst,
	upperFirst,
};
