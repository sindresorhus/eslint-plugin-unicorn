import quoteJsString from 'quote-js-string';

/**
Escape string and wrap the result in quotes.

@param {string} string - The string to be quoted.
@param {string} [quote] - The quote character.
@returns {string} - The quoted and escaped string.
*/
export default function escapeString(string, quote = '\'') {
	/* node:coverage disable */
	if (typeof string !== 'string') {
		throw new TypeError('Unexpected string.');
	}
	/* node:coverage enable */

	return quoteJsString(string, quote);
}
