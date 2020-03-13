'use strict';

const getReferences = scope => scope.references.concat(
	...scope.childScopes.map(scope => getReferences(scope))
);

module.exports = getReferences;
