'use strict';
const {uniq, flatten} = require('lodash');

const getReferences = scope => uniq([
	...scope.references,
	...flatten(scope.childScopes.map(scope => getReferences(scope)))
]);

module.exports = getReferences;
