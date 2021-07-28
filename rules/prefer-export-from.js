'use strict';
const {
	isCommaToken,
	isOpeningBraceToken,
	isClosingBraceToken,
} = require('eslint-utils');

const MESSAGE_ID = 'prefer-export-from';
const messages = {
	[MESSAGE_ID]: 'Use `export…from` syntax to re-export `{{imported}}`.',
};

function * removeSpecifier(node, options) {
	const {nodes, removedSpecifiers, fixer, sourceCode} = options;

	const {parent} = node;
	const {specifiers} = parent;

	if (specifiers.every(specifier => nodes.has(specifier))) {
		for (const specifier of specifiers) {
			removedSpecifiers.add(specifier);
		}

		yield * removeImportOrExport(parent, options);
		return;
	}

	switch (node.type) {
		case 'ExportSpecifier':
		case 'ImportSpecifier': {
			const hasOtherSpecifiers = specifiers.some(specifier => specifier !== node && specifier.type === node.type);
			if (!hasOtherSpecifiers) {
				const closingBraceToken = sourceCode.getTokenAfter(node, isClosingBraceToken);
				// If there are other specifiers, they have to be default import/export
				// And default import/export has to write before the named import/export
				// So there must be a comma before
				const commaToken = sourceCode.getTokenBefore(node, isCommaToken);
				yield fixer.replaceTextRange([commaToken.range[0], closingBraceToken.range[1]], '');
				return;
			}
			// Fallthrough
		}

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

function * removeImportOrExport(node, options) {
	switch (node.type) {
		case 'ImportSpecifier':
		case 'ExportSpecifier':
		case 'ImportDefaultSpecifier':
		case 'ImportNamespaceSpecifier': {
			yield * removeSpecifier(node, options);
			return;
		}

		case 'ImportDeclaration':
		case 'ExportDefaultDeclaration':
		case 'ExportNamedDeclaration': {
			yield options.fixer.remove(node);
		}

		// No default
	}
}

function fix({
	context,
	imported,
	importDeclaration,
	exported,
	exportDeclarations,
	program,
}) {
	const sourceCode = context.getSourceCode();
	const sourceNode = importDeclaration.source;
	const sourceValue = sourceNode.value;
	const sourceText = sourceCode.getText(sourceNode);
	const exportDeclaration = exportDeclarations.find(({source}) => source.value === sourceValue);

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		if (imported.name === '*') {
			for (const {name: exportedName} of exported) {
				yield fixer.insertTextAfter(
					program,
					`\nexport * as ${exportedName} from ${sourceText};`,
				);
			}
		} else {
			const specifiers = exported.map(({name}) => name === imported.name ? name : `${imported.name} as ${name}`)
				.join(',');

			if (exportDeclaration) {
				const lastSpecifier = exportDeclaration.specifiers[exportDeclaration.specifiers.length - 1];

				// `export {} from 'foo';`
				if (lastSpecifier) {
					yield fixer.insertTextAfter(lastSpecifier, `, ${specifiers}`);
				} else {
					const openingBraceToken = sourceCode.getFirstToken(exportDeclaration, isOpeningBraceToken);
					yield fixer.insertTextAfter(openingBraceToken, specifiers);
				}
			} else {
				yield fixer.insertTextAfter(
					program,
					`\nexport {${specifiers}} from ${sourceText};`,
				);
			}
		}

		const nodes = new Set([imported.node, ...exported.map(({node}) => node)]);
		// Add this cache to prevent removing specifiers one by one and leave an empty `export {}`
		const removedSpecifiers = new Set();
		for (const node of nodes) {
			if (removedSpecifiers.has(node)) {
				continue;
			}

			yield * removeImportOrExport(node, {
				fixer,
				sourceCode,
				removedSpecifiers,
				nodes,
			});
		}
	};
}

function getImported(identifier) {
	const {parent} = identifier;
	switch (parent.type) {
		case 'ImportDefaultSpecifier':
			return {
				node: parent,
				name: 'default',
			};

		case 'ImportSpecifier':
			return {
				node: parent,
				name: parent.imported.name,
			};

		case 'ImportNamespaceSpecifier':
			return {
				node: parent,
				name: '*',
			};

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
				parent.init === identifier &&
				parent.id.type === 'Identifier' &&
				parent.parent.type === 'VariableDeclaration' &&
				parent.parent.kind === 'const' &&
				parent.parent.declarations.length === 1 &&
				parent.parent.declarations[0] === parent &&
				parent.parent.parent.type === 'ExportNamedDeclaration' &&
				isVariableUnused(parent, context)
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
	return identifiers.length === 1 &&
		identifiers[0] === node.id &&
		references.length === 1 &&
		references[0].identifier === node.id;
}

function getProblem({
	context,
	variable,
	importDeclaration,
	program,
	exportDeclarations,
}) {
	const {identifiers, references} = variable;

	if (identifiers.length !== 1 || references.length === 0) {
		return;
	}

	const [identifier] = identifiers;
	const exported = references.map(({identifier}) => getExported(identifier, context));

	if (!exported.every(Boolean)) {
		return;
	}

	const imported = getImported(identifier);

	/*
	There is no substitute for
	```js
	import * as foo from 'foo';
	export default foo;
	```js
	*/
	if (imported.name === '*' && exported.some(({name}) => name === 'default')) {
		return;
	}

	return {
		node: imported.node,
		messageId: MESSAGE_ID,
		data: {
			imported: imported.name,
		},
		fix: fix({
			context,
			imported,
			importDeclaration,
			exported,
			exportDeclarations,
			program,
		}),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const importDeclarations = new Set();
	const exportDeclarations = [];

	return {
		'ImportDeclaration[specifiers.length>0]'(node) {
			importDeclarations.add({
				node,
				variables: context.getDeclaredVariables(node),
			});
		},
		// `ExportAllDeclaration` and `ExportDefaultDeclaration` can't be reused
		'ExportNamedDeclaration[source.type="Literal"]'(node) {
			exportDeclarations.push(node);
		},
		* 'Program:exit'(program) {
			for (const {node: importDeclaration, variables} of importDeclarations) {
				for (const variable of variables) {
					const problem = getProblem({
						context,
						variable,
						importDeclaration,
						exportDeclarations,
						program,
					});

					if (problem) {
						yield problem;
					}
				}
			}
		},
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `export…from` syntax when re-exporting.',
		},
		fixable: 'code',
		messages,
	},
};
