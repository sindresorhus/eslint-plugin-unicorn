'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'consistentFunctionScoping';

function checkVariables(scope, variables) {
	if (!variables || variables.length === 0) {
		return false;
	}

	const hit = variables.some(variable => {
		if (!variable.references || variable.references.length === 0) {
			return false;
		}

		return variable.references.some(reference => {
			return reference.from === scope;
		});
	});

	if (hit) {
		return hit;
	}

	return scope.childScopes.some(scope => {
		return checkVariables(scope, variables);
	});
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	return {
		FunctionDeclaration(node) {
			const scope = scopeManager.acquire(node);
			if (!scope) {
				return;
			}

			if (scope.type === 'global') {
				return;
			}

			let parentNode = node.parent;
			if (!parentNode) {
				return;
			}

			if (parentNode.type === 'BlockStatement') {
				parentNode = parentNode.parent;
			}

			const parentScope = scopeManager.acquire(parentNode);
			if (!parentScope || parentScope.type === 'global') {
				return;
			}

			const hit = checkVariables(scope, parentScope.variables);

			if (hit) {
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
