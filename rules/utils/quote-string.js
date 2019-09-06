'use strict';

/**
Escape apostrophe and wrap in single quotes

@param {string} string - The string to be quoted.
@returns {string} - The quoted string.
*/

module.exports = string => `'${string.replace(/'/g, '\\\'')}'`;
