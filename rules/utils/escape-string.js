'use strict';

const jsesc = require('jsesc');

/**
Escape string and wrap the result in quotes.

@param {string} string - The string to be quoted.
@param {string} [quote] - The quote character.
@returns {string} - The quoted and escaped string.
*/
module.exports = (string, quote = '\'') => {
	if (typeof string !== 'string') {
		throw new TypeError('Unexpected string.')
	}

	return jsesc(string, {
		quotes: quote === '"' ? 'double' : 'single',
		wrap: true,
		es6: true,
		minimal: true,
		lowercaseHex: false,
	});
};
