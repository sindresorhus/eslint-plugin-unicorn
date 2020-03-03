'use strict';

/**
Escape string and wrap the result in quotes.

@param {string} string - The string to be quoted.
@param {string} quote - The quote character.
@returns {string} - The quoted and escaped string.
*/
module.exports = (string, quote = '\'') => {
	const escaped = string
		.replace(new RegExp(quote, 'g'), `\\${quote}`)
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n');
	return quote + escaped + quote;
};
