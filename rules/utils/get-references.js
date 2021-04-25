'use strict';
const {uniq, flatten} = require('lodash');

const getReferences = scope => uniq([
	...scope.references,
	...scope.childScopes.flatMap(scope => getReferences(scope))
]);

module.exports = getReferences;
