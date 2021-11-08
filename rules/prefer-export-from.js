'use strict';
const {
	isCommaToken,
	isOpeningBraceToken,
	isClosingBraceToken,
} = require('eslint-utils');

const MESSAGE_ID = 'prefer-export-from';
const messages = {
	[MESSAGE_ID]: 'Use `export…from` to re-export `{{exported}}`.',
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

function fix({
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

function * getProblems({
	context,
	variable,
	program,
	exportDeclarations,
}) {
	const {identifiers, references} = variable;

	if (identifiers.length !== 1 || references.length === 0) {
		return;
	}

	const specifier = identifiers[0].parent;

	const imported = {
		name: getImportedName(specifier),
		node: specifier,
		declaration: specifier.parent,
		variable,
	};

	for (const {identifier} of references) {
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
			return;
		}

		yield {
			node: exported.node,
			messageId: MESSAGE_ID,
			data: {
				exported: exported.name,
			},
			fix: fix({
				context,
				imported,
				exported,
				exportDeclarations,
				program,
			}),
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const variables = [];
	const exportDeclarations = [];

	return {
		'ImportDeclaration[specifiers.length>0]'(node) {
			variables.push(...context.getDeclaredVariables(node));
		},
		// `ExportAllDeclaration` and `ExportDefaultDeclaration` can't be reused
		'ExportNamedDeclaration[source.type="Literal"]'(node) {
			exportDeclarations.push(node);
		},
		* 'Program:exit'(program) {
			for (const variable of variables) {
				yield * getProblems({
					context,
					variable,
					exportDeclarations,
					program,
				});
			}
		},
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `export…from` when re-exporting.',
		},
		fixable: 'code',
		messages,
	},
};
