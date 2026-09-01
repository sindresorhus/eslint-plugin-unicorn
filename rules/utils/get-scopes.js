/**
Gather a list of all Scopes starting recursively from the input Scope.

@param {Scope} scope - The Scope to start checking from.
@returns {Scope[]} - The resulting Scopes.
*/
const getScopes = scope => {
	// Appending while walking by index visits every descendant scope without recursion.
	const scopes = [scope];
	for (let index = 0; index < scopes.length; index++) {
		scopes.push(...scopes[index].childScopes);
	}

	return scopes;
};

export default getScopes;
