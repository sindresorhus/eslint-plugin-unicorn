'use strict';
const {
	isCommaToken,
	isOpeningBraceToken,
	isClosingBraceToken,
} = require('eslint-utils');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Use `export…from` to re-export `{{exported}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `export…from`.',
};

function * removeSpecifier(node, fixer, sourceCode) {
	const {parent} = node;
	const {specifiers} = parent;

	if (specifiers.length === 1) {
		yield * removeImportOrExport(parent, fixer, sourceCode);
		return;
	}

	switch (node.type) {
		case 'ImportSpecifier': {
			const hasOtherSpecifiers = specifiers.some(specifier => specifier !== node && specifier.type === node.type);
			if (!hasOtherSpecifiers) {
				const closingBraceToken = sourceCode.getTokenAfter(node, isClosingBraceToken);

				// If there are other specifiers, they have to be the default import specifier
				// And the default import has to write before the named import specifiers
				// So there must be a comma before
				const commaToken = sourceCode.getTokenBefore(node, isCommaToken);
				yield fixer.replaceTextRange([commaToken.range[0], closingBraceToken.range[1]], '');
				return;
			}
			// Fallthrough
		}

		case 'ExportSpecifier':
		case 'ImportNamespaceSpecifier':
		case 'ImportDefaultSpecifier': {
			yield fixer.remove(node);

			const tokenAfter = sourceCode.getTokenAfter(node);
			if (isCommaToken(tokenAfter)) {
				yield fixer.remove(tokenAfter);
			}

			break;
		}

		// No default
	}
}

function * removeImportOrExport(node, fixer, sourceCode) {
	switch (node.type) {
		case 'ImportSpecifier':
		case 'ExportSpecifier':
		case 'ImportDefaultSpecifier':
		case 'ImportNamespaceSpecifier': {
			yield * removeSpecifier(node, fixer, sourceCode);
			return;
		}

		case 'ImportDeclaration':
		case 'ExportDefaultDeclaration':
		case 'ExportNamedDeclaration': {
			yield fixer.remove(node);
		}

		// No default
	}
}

function getFixFunction({
	context,
	imported,
	exported,
	exportDeclarations,
	program,
}) {
	const sourceCode = context.getSourceCode();
	const sourceNode = imported.declaration.source;
	const sourceValue = sourceNode.value;
	const sourceText = sourceCode.getText(sourceNode);
	const exportDeclaration = exportDeclarations.find(({source}) => source.value === sourceValue);

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		if (imported.name === '*') {
			yield fixer.insertTextAfter(
				program,
				`\nexport * as ${exported.name} from ${sourceText};`,
			);
		} else {
			const specifier = exported.name === imported.name
				? exported.name
				: `${imported.name} as ${exported.name}`;

			if (exportDeclaration) {
				const lastSpecifier = exportDeclaration.specifiers[exportDeclaration.specifiers.length - 1];

				// `export {} from 'foo';`
				if (lastSpecifier) {
					yield fixer.insertTextAfter(lastSpecifier, `, ${specifier}`);
				} else {
					const openingBraceToken = sourceCode.getFirstToken(exportDeclaration, isOpeningBraceToken);
					yield fixer.insertTextAfter(openingBraceToken, specifier);
				}
			} else {
				yield fixer.insertTextAfter(
					program,
					`\nexport {${specifier}} from ${sourceText};`,
				);
			}
		}

		if (imported.variable.references.length === 1) {
			yield * removeImportOrExport(imported.node, fixer, sourceCode);
		}

		yield * removeImportOrExport(exported.node, fixer, sourceCode);
	};
}

function getImportedName(specifier) {
	switch (specifier.type) {
		case 'ImportDefaultSpecifier':
			return 'default';

		case 'ImportSpecifier':
			return specifier.imported.name;

		case 'ImportNamespaceSpecifier':
			return '*';

		// No default
	}
}

function getExported(identifier, context) {
	const {parent} = identifier;
	switch (parent.type) {
		case 'ExportDefaultDeclaration':
			return {
				node: parent,
				name: 'default',
			};

		case 'ExportSpecifier':
			return {
				node: parent,
				name: parent.exported.name,
			};

		case 'VariableDeclarator': {
			if (
				parent.init === identifier
				&& parent.id.type === 'Identifier'
				&& !parent.id.typeAnnotation
				&& parent.parent.type === 'VariableDeclaration'
				&& parent.parent.kind === 'const'
				&& parent.parent.declarations.length === 1
				&& parent.parent.declarations[0] === parent
				&& parent.parent.parent.type === 'ExportNamedDeclaration'
				&& isVariableUnused(parent, context)
			) {
				return {
					node: parent.parent.parent,
					name: parent.id.name,
				};
			}

			break;
		}

		// No default
	}
}

function isVariableUnused(node, context) {
	const variables = context.getDeclaredVariables(node);

	/* istanbul ignore next */
	if (variables.length !== 1) {
		return false;
	}

	const [{identifiers, references}] = variables;
	return identifiers.length === 1
		&& identifiers[0] === node.id
		&& references.length === 1
		&& references[0].identifier === node.id;
}

function getImported(variable) {
	const specifier = variable.identifiers[0].parent;
	return {
		name: getImportedName(specifier),
		node: specifier,
		declaration: specifier.parent,
		variable,
	};
}

function getExports(imported, context) {
	const exports = [];
	for (const {identifier} of imported.variable.references) {
		const exported = getExported(identifier, context);

		if (!exported) {
			continue;
		}

		/*
		There is no substitution for:

		```js
		import * as foo from 'foo';
		export default foo;
		```
		*/
		if (imported.name === '*' && exported.name === 'default') {
			continue;
		}

		exports.push(exported);
	}

	return exports;
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignoreUsedVariables: {
				type: 'boolean',
				default: false,
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {ignoreUsedVariables} = {ignoreUsedVariables: false, ...context.options[0]};
	const importDeclarations = new Set();
	const exportDeclarations = [];

	return {
		'ImportDeclaration[specifiers.length>0]'(node) {
			importDeclarations.add(node);
		},
		// `ExportAllDeclaration` and `ExportDefaultDeclaration` can't be reused
		'ExportNamedDeclaration[source.type="Literal"]'(node) {
			exportDeclarations.push(node);
		},
		* 'Program:exit'(program) {
			for (const importDeclaration of importDeclarations) {
				const variables = context.getDeclaredVariables(importDeclaration)
					.map(variable => {
						const imported = getImported(variable);
						const exports = getExports(imported, context);

						return {
							variable,
							imported,
							exports,
						};
					});

				if (
					ignoreUsedVariables
					&& variables.some(({variable, exports}) => variable.references.length !== exports.length)
				) {
					continue;
				}

				const shouldUseSuggestion = ignoreUsedVariables
					&& variables.some(({variable}) => variable.references.length === 0);

				for (const {imported, exports} of variables) {
					for (const exported of exports) {
						const problem = {
							node: exported.node,
							messageId: MESSAGE_ID_ERROR,
							data: {
								exported: exported.name,
							},
						};
						const fix = getFixFunction({
							context,
							imported,
							exported,
							exportDeclarations,
							program,
						});

						if (shouldUseSuggestion) {
							problem.suggest = [
								{
									messageId: MESSAGE_ID_SUGGESTION,
									fix,
								},
							];
						} else {
							problem.fix = fix;
						}

						yield problem;
					}
				}
			}
		},
	};
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `export…from` when re-exporting.',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		messages,
	},
};
