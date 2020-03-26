'use strict';
const {uniq} = require('lodash');

const getReferences = scope => uniq(
	scope.references.concat(
		...scope.childScopes.map(scope => getReferences(scope))
	)
);

module.exports = getReferences;
