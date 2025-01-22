const MESSAGE_ID_ERROR = 'consistent-assert/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const exportStrictAssertModules = new Set(['assert', 'node:assert']);
const assertModules = new Set([...exportStrictAssertModules, 'assert/strict', 'node:assert/strict']);

/**
Check if a specifier is a valid import for the rule.

@param {import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier} specifier
@param {string} moduleName
*/
const isValidSpecifier = (specifier, moduleName) =>
	specifier.type === 'ImportDefaultSpecifier' // Default import
	|| (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'strict' && exportStrictAssertModules.has(moduleName)); // Named import

/**
Report an error for an invalid assertion usage.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Identifier} identifier
*/
const reportProblem = (context, identifier) => {
	const replacement = identifier.name + '.ok';

	context.report({
		node: identifier,
		messageId: MESSAGE_ID_ERROR,
		data: {
			value: identifier.name,
			replacement,
		},
		/** @param {import('eslint').Rule.RuleFixer} fixer */
		fix: fixer => fixer.replaceText(identifier, replacement),
	});
};

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => {
	const {sourceCode} = context;

	return {
		ImportDeclaration(node) {
			if (!assertModules.has(node.source.value)) {
				return;
			}

			const scope = sourceCode.getScope(node);

			const specifiers = node.specifiers.filter(specifier => isValidSpecifier(specifier, node.source.value));

			for (const specifier of specifiers) {
				const variable = scope.variables.find(variable => variable.name === specifier.local.name);
				if (!variable) {
					continue;
				}

				for (const reference of variable.references) {
					const {identifier} = reference;

					const {parent} = identifier;

					const isFunctionCall = () => parent.type === 'CallExpression' && parent.callee === identifier;

					// Skip if the identifier is not part of a call expression
					if (!isFunctionCall()) {
						continue;
					}

					reportProblem(context, identifier);
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
