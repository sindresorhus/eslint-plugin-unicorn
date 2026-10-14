import getScopes from './get-scopes.js';

const getReferences = scope => [...new Set(getScopes(scope).flatMap(({references}) => references))];

/**
Get the references whose identifier is inside `node`.

Only the scopes that overlap `node` are visited, instead of every scope below the scope of `node`, which for top-level code is the whole file.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {import('eslint').Scope.Reference[]}
*/
export function getReferencesInside(node, context) {
	const {sourceCode} = context;
	const [start, end] = sourceCode.getRange(node);
	const references = [];

	// Appending while walking by index visits every overlapping descendant scope without recursion.
	const scopes = [sourceCode.getScope(node)];
	for (let index = 0; index < scopes.length; index++) {
		const scope = scopes[index];
		for (const reference of scope.references) {
			const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
			if (referenceStart >= start && referenceEnd <= end) {
				references.push(reference);
			}
		}

		for (const childScope of scope.childScopes) {
			const [blockStart, blockEnd] = sourceCode.getRange(childScope.block);
			if (blockStart < end && blockEnd > start) {
				scopes.push(childScope);
			}
		}
	}

	return references;
}

export default getReferences;
