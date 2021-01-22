'use strict';
const {uniq, flatten} = require('lodash');

const getReferences = ({references, childScopes}) => uniq([
	...references,
	...flatten(childScopes.map(scope => getReferences(scope)))
]);

module.exports = getReferences;
