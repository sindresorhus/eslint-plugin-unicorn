'use strict';

/**
Escape string and wrap the result in quotes.

@param {string} string - The string to be quoted.
@param {string} quote - The quote character.
@returns {string} - The quoted and escaped string.
*/
module.exports = (string, quote = '\'') => {
	const escaped = string
		.replace(/\\/g, '\\\\')
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(new RegExp(quote, 'g'), `\\${quote}`);
	return quote + escaped + quote;
};
