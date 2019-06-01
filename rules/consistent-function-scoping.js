'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'consistentFunctionScoping';

function checkReferences(scope, parents, scopeManager) {
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
			return parents.includes(reference.from);
		});

		if (hitReference) {
			return true;
		}

		const hitDefinitions = variable.defs.some(definition => {
			const scope = scopeManager.acquire(definition.node);
			return parents.includes(scope);
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
		return checkReferences(scope, parents, scopeManager);
	});
}

function checkNode(node, scopeManager) {
	const scope = scopeManager.acquire(node);
	if (!scope) {
		return true;
	}

	if (scope.type === 'global') {
		return true;
	}

	const parents = [];

	let parentNode = node.parent;
	if (!parentNode) {
		return true;
	}

	parents.push(parentNode);

	if (parentNode.type === 'Identifier') {
		parentNode = parentNode.parent;
		parents.push(parentNode);
	}

	if (parentNode.type === 'VariableDeclarator') {
		parentNode = parentNode.parent;
		parents.push(parentNode);
	}

	if (parentNode.type === 'VariableDeclaration') {
		parentNode = parentNode.parent;
		parents.push(parentNode);
	}

	if (parentNode.type === 'BlockStatement') {
		parentNode = parentNode.parent;
		parents.push(parentNode);
	}

	if (parentNode.type === 'Program') {
		return true;
	}

	const parentScope = scopeManager.acquire(parentNode);
	if (!parentScope || parentScope.type === 'global') {
		return true;
	}

	const parentScopes = parents.map(parent => {
		return scopeManager.acquire(parent);
	});

	return checkReferences(scope, parentScopes, scopeManager);
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
				messageId: MESSAGE_ID
			});
		},
		FunctionDeclaration(node) {
			const valid = checkNode(node, scopeManager);

			if (valid) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID
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
			[MESSAGE_ID]: 'Move function to outer scope.'
		}
	}
};
