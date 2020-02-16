'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_ARROW = 'ArrowFunctionExpression';
const MESSAGE_ID_FUNCTION = 'FunctionDeclaration';

const getReferences = scope => scope.references.concat(
	...scope.childScopes.map(scope => getReferences(scope))
);

const isSameScope = (scope1, scope2) =>
	scope1 && scope2 && (scope1 === scope2 || scope1.block === scope2.block);

function checkReferences(scope, parent, scopeManager) {
	if (!scope) {
		return false;
	}

	const references = getReferences(scope);
	if (!references || references.length === 0) {
		return false;
	}

	const hit = references.some(reference => {
		const variable = reference.resolved;

		if (!variable) {
			return false;
		}

		const hitReference = variable.references.some(reference => {
			return isSameScope(parent, reference.from);
		});

		if (hitReference) {
			return true;
		}

		const hitDefinitions = variable.defs.some(definition => {
			const scope = scopeManager.acquire(definition.node);
			return isSameScope(parent, scope);
		});

		if (hitDefinitions) {
			return true;
		}

		// This check looks for neighboring function definitions
		const hitIdentifier = variable.identifiers.some(identifier => {
			// Only look at identifiers that live in a FunctionDeclaration
			if (
				!identifier.parent ||
				identifier.parent.type !== 'FunctionDeclaration'
			) {
				return false;
			}

			const identifierScope = scopeManager.acquire(identifier);

			// If we have a scope, the earlier checks should have worked so ignore them here
			if (identifierScope) {
				return false;
			}

			const identifierParentScope = scopeManager.acquire(identifier.parent);
			if (!identifierParentScope) {
				return false;
			}

			// Ignore identifiers from our own scope
			if (scope === identifierParentScope) {
				return false;
			}

			// Look at the scope above the function definition to see if lives
			// next to the reference being checked
			return isSameScope(parent, identifierParentScope.upper);
		});

		if (hitIdentifier) {
			return true;
		}

		return false;
	});

	if (hit) {
		return true;
	}

	return scope.childScopes.some(scope => {
		return checkReferences(scope, parent, scopeManager);
	});
}

function checkNode(node, scopeManager) {
	const scope = scopeManager.acquire(node);
	if (!scope) {
		return true;
	}

	let parentNode = node.parent;
	if (!parentNode) {
		return true;
	}

	// Skip over junk like the block statement inside of a function declaration
	// or the various pieces of an arrow function.

	if (parentNode.type === 'VariableDeclarator') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'VariableDeclaration') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'BlockStatement') {
		parentNode = parentNode.parent;
	}

	const parentScope = scopeManager.acquire(parentNode);
	if (!parentScope || parentScope.type === 'global') {
		return true;
	}

	return checkReferences(scope, parentScope, scopeManager);
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	const functions = [];
	let hasJsx = false;

	return {
		'ArrowFunctionExpression, FunctionDeclaration': node => functions.push(node),
		JSXElement: () => {
			// Turn off this rule if we see a JSX element because scope
			// references does not include JSXElement nodes.
			hasJsx = true;
		},
		':matches(ArrowFunctionExpression, FunctionDeclaration):exit': node => {
			if (!hasJsx && !checkNode(node, scopeManager)) {
				context.report({
					node,
					messageId: node.type
				});
			}

			functions.pop();
			if (functions.length === 0) {
				hasJsx = false;
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[MESSAGE_ID_ARROW]: 'Move arrow function to the outer scope.',
			[MESSAGE_ID_FUNCTION]: 'Move function to the outer scope.'
		}
	}
};
