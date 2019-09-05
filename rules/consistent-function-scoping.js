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

	return {
		ArrowFunctionExpression(node) {
			const valid = checkNode(node, scopeManager);

			if (valid) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID_ARROW
			});
		},
		FunctionDeclaration(node) {
			const valid = checkNode(node, scopeManager);

			if (valid) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID_FUNCTION
			});
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
