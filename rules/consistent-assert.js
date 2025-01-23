const MESSAGE_ID_ERROR = 'consistent-assert/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{name}}.ok` over `{{name}}`.',
};

/**
Check if a specifier is `assert` function.

@param {import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier} specifier
@param {string} moduleName
*/
const isAssertFunction = (specifier, isNodeAssertModule) =>
	// `import assert from 'node:assert';`
	// `import assert from 'node:assert/strict';`
	specifier.type === 'ImportDefaultSpecifier'
	// `import {assert} from 'node:assert';`
	|| (
		isNodeAssertModule
		&& specifier.type === 'ImportSpecifier'
		&& specifier.imported.name === 'strict'
	);

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => {
	const {sourceCode} = context;

	return {
		* ImportDeclaration(importDeclaration) {
			const moduleName = importDeclaration.source.value;

			if (importDeclaration.importKind === 'type') {
				return;
			}

			const isNodeAssertModule = moduleName === 'assert' || moduleName === 'node:assert';
			const isNodeAssertStrictModule = moduleName === 'assert/strict' || moduleName === 'node:assert/strict';

			if (!isNodeAssertModule && !isNodeAssertStrictModule) {
				return;
			}

			for (const specifier of importDeclaration.specifiers) {
				if (specifier.importKind === 'type' || !isAssertFunction(specifier, isNodeAssertModule)) {
					continue;
				}

				const variables = sourceCode.getDeclaredVariables(specifier);

				/* c8 ignore next 3 */
				if (!Array.isArray(variables) && variables.length === 1) {
					continue;
				}

				const [variable] = variables;

				for (const {identifier} of variable.references) {
					if (!(identifier.parent.type === 'CallExpression' && identifier.parent.callee === identifier)) {
						continue;
					}

					yield {
						node: identifier,
						messageId: MESSAGE_ID_ERROR,
						data: {name: identifier.name},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.insertTextAfter(identifier, '.ok'),
					};
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce consistent assertion styles with `node:assert`',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
