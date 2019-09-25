'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID_ARROW = 'ArrowFunctionExpression';
const MESSAGE_ID_FUNCTION = 'FunctionDeclaration';

function checkReferences(scope, parent, scopeManager) {
	if (!scope) {
		return false;
	}

	const {references} = scope;
	if (!references || references.length === 0) {
		return false;
	}

	const hit = references.some(reference => {
		const variable = reference.resolved;

		if (!variable) {
			return false;
		}

		const hitReference = variable.references.some(reference => {
			return parent === reference.from;
		});

		if (hitReference) {
			return true;
		}

		const hitDefinitions = variable.defs.some(definition => {
			const scope = scopeManager.acquire(definition.node);
			return parent === scope;
		});

		if (hitDefinitions) {
			return true;
		}

		// This check looks for neighboring function definitions
		const hitIdentifier = variable.identifiers.some(identifier => {
			// Only look at identifiers that live in a FunctionDeclaration
			if (!identifier.parent || identifier.parent.type !== 'FunctionDeclaration') {
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
			return parent === identifierParentScope.upper;
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

	const reports = [];
	let hasJsx = false;

	return {
		ArrowFunctionExpression: node => {
			const valid = checkNode(node, scopeManager);

			if (valid) {
				reports.push(null);
			} else {
				reports.push({
					node,
					messageId: MESSAGE_ID_ARROW
				});
			}
		},
		FunctionDeclaration: node => {
			const valid = checkNode(node, scopeManager);

			if (valid) {
				reports.push(null);
			} else {
				reports.push({
					node,
					messageId: MESSAGE_ID_FUNCTION
				});
			}
		},
		JSXElement: () => {
			// Turn off this rule if we see a JSX element because scope
			// references does not include JSXElement nodes.
			hasJsx = true;
		},
		':matches(ArrowFunctionExpression, FunctionDeclaration):exit': () => {
			const report = reports.pop();
			if (report && !hasJsx) {
				context.report(report);
			}

			if (reports.length === 0) {
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
			url: getDocsUrl(__filename)
		},
		messages: {
			[MESSAGE_ID_ARROW]: 'Move arrow function to the outer scope.',
			[MESSAGE_ID_FUNCTION]: 'Move function to the outer scope.'
		}
	}
};
