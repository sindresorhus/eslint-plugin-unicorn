'use strict';

const MESSAGE_ID_ERROR = 'prefer-global-this/error';
const MESSAGE_ID_SUGGESTION = 'prefer-global-this/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
 * Find the variable in the scope
 * @param {import('eslint').Scope.Scope} scope
 * @param {string} variableName
 * @returns
 */
function findVariableInScope(scope, variableName) {
	if (!scope || scope.type === 'global') {
		return undefined;
	}

	const variable = scope.variables.find(v => v.name === variableName);

	if (variable) {
		return variable;
	}

	return findVariableInScope(scope.upper, variableName);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Identifier(node) {
		if (node.name !== 'window' && node.name !== 'global') {
			return;
		}

		const ancestors = context.sourceCode.getAncestors(node);

		const parent = ancestors.length > 0 ? ancestors.at(-1) : undefined;

		// Skip `window` and `global` in function declarations and variable declarations.
		if (parent) {
			if (['FunctionDeclaration', 'FunctionExpression'].includes(parent.type)) {
				// Skip `function window() {}` and `function global() {}`
				if (parent.id === node) {
					return;
				}

				// Skip `function foo(window) {}` and `function foo(global) {}`
				if (parent.params.includes(node)) {
					return;
				}

				return;
			}

			// Skip `var window = 1;` and `var global = 1;`
			if (parent.type === 'VariableDeclarator' && parent.id === node) {
				return;
			}
		}

		const variable = findVariableInScope(
			context.sourceCode.getScope(node),
			node.name,
		);

		// Skip that has been declared in the scope
		if (variable) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				value: node.name,
				replacement: 'globalThis',
			},

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => fixer.replaceText(node, 'globalThis'),

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						value: node.name,
						replacement: 'globalThis',
					},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node, 'globalThis'),
				},
			],
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `globalThis` instead of `window` and `global`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
