'use strict';
const {uniq} = require('lodash');

// Get identifiers of given variable
module.exports = ({identifiers, references}) => uniq([
	...identifiers,
	...references.map(({identifier}) => identifier),
]);
