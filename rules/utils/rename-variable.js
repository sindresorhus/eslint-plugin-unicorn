'use strict';

/**
Insert text after the line of the node.

@param {import('eslint').Rule.RuleFixer} fixer
@param {import('estree').Node} node
@param {string} text
*/
function * insertTextAfterLine(fixer, node, text) {
	const nodeIndentCount = node.loc?.start.column ?? 0;

	const indent = ' '.repeat(nodeIndentCount);

	yield fixer.insertTextAfter(node, '\n' + indent);

	yield fixer.insertTextAfter(node, '\n' + indent + text);
}

/**
Incrementing a variable

@param {string} variableName
*/
function incrementVariableName(variableName) {
	const match = variableName.match(/(\d+)$/);

	if (match) {
		const number = Number.parseInt(match[1], 10);
		return variableName.replace(/\d+$/, number + 1);
	}

	return `${variableName}1`;
}

/**
Get a variable name that does not conflict with existing variables in the scope.

@param {import('eslint').Scope.Scope} scope
@param {string} variableName
@param {Array<import('estree').Identifier>} ignores
@returns {string}
*/
function getNonConflictingVariableName(scope, variableName, ignores) {
	for (const variable of scope.variables) {
		// Skip ignored variables
		if (variable.defs.some(definition => ignores.includes(definition.node))) {
			continue;
		}

		if (variable.name === variableName) {
			return getNonConflictingVariableName(scope, incrementVariableName(variableName), ignores);
		}
	}

	return variableName;
}

/**
Replace the string between start and end with replacement.

@param {string} string
@param {number} start
@param {number} end
@param {string} replacement
@returns {string}
*/
function replaceStringWithSlice(string, start, end, replacement) {
	return string.slice(0, start) + replacement + string.slice(end);
}

/**
Determine if the identifier is exported.

@param {import('estree').Identifier} identifier
@returns
*/
function isExportedVariable(identifier) {
	return (
		identifier
		&& identifier.parent?.type === 'VariableDeclarator'
		&& identifier.parent.parent?.type === 'VariableDeclaration'
		&& identifier.parent.parent.parent?.type === 'ExportNamedDeclaration'
	);
}

/**
Replace the variable name.

@param {import('eslint').SourceCode} sourceCode
@param {import('eslint').Scope.Scope} scope
@param {import('eslint').Rule.RuleFixer} fixer
@param {import('estree').Identifier} identifier
@param {string} newVariableName
*/
function * replace(sourceCode, fixer, identifier, newVariableName) {
	/**
	Before:
		```js
		export const foo = 1
		```

	After:
		```js
		const bar = 1
		export { bar as foo }
		```
	 */
	if (isExportedVariable(identifier)) {
		/** @type {import('estree').VariableDeclaration} */
		const variableDeclaration = identifier.parent.parent;
		/** @type { import('estree').ExportNamedDeclaration } */
		const exportNamedDeclaration = identifier.parent.parent.parent;

		let newDeclaration = sourceCode.getText(variableDeclaration);

		for (const variableDeclarator of variableDeclaration.declarations) {
			if (variableDeclarator.id === identifier) {
				const base = variableDeclaration.range[0];
				// Replace the content of the declaration
				const start = variableDeclarator.id.range[0] - base;
				const end = variableDeclarator.id.range[1] - base;

				newDeclaration = replaceStringWithSlice(newDeclaration, start, end, newVariableName);
			}
		}

		yield fixer.replaceText(exportNamedDeclaration, newDeclaration);

		yield * insertTextAfterLine(fixer, exportNamedDeclaration, `export { ${newVariableName} as ${identifier.name} }`);
	} else {
		yield fixer.replaceText(identifier, newVariableName);

		// @typescript-eslint/parser and @babel/parser will parse type annotation as Identifier
		if (identifier.typeAnnotation) {
			const originalText = sourceCode.getText(identifier);

			const typeAnnotationText = originalText.slice(
				identifier.typeAnnotation.range[0] - identifier.range[0],
				identifier.typeAnnotation.range[1] - identifier.range[0],
			);
			yield fixer.insertTextAfter(identifier, typeAnnotationText);
		}
	}
}

/**
Rename the variable and it's references safely.

@param {import('eslint').SourceCode} sourceCode
@param {import('eslint').Scope.Scope} scope
@param {import('eslint').Rule.RuleFixer} fixer
@param {import('estree').Identifier} identifier
@param {string} variableName
*/
function * renameVariable(sourceCode, scope, fixer, identifier, variableName) {
	const newVariableName = getNonConflictingVariableName(scope, variableName, [identifier]);

	yield * replace(sourceCode, fixer, identifier, newVariableName);

	const variable = scope.variables.find(variable => variable.name === identifier.name);

	const references = variable?.references ?? scope.references.filter(reference => reference.identifier.name === identifier.name);

	for (const reference of references) {
		if (reference.identifier !== identifier) {
			/** @type {import('estree').Node}  */
			const {parent} = reference.identifier;

			if (parent && parent.type === 'Property' && parent.value === reference.identifier && parent.shorthand) {
				/**
				Replace shorthand property

				Before:
					```js
					const foo = 1

					const obj = {
						foo
					}
					```

				After:
					```js
					const bar = 1

					const obj = {
						foo: bar
					}
					```
				 */
				yield fixer.insertTextAfter(reference.identifier, `: ${newVariableName}`);
			} else if (parent && parent.type === 'ExportSpecifier' && parent.local === reference.identifier) {
				/**
				Replace export specifier

				Before:
					```js
					const foo = 1

					export { foo }
					```

				After:
					```js
					const bar = 1

					export { foo as bar }
					```
				 */
				yield fixer.insertTextBefore(reference.identifier, `${newVariableName} as `);
			} else {
				yield fixer.replaceText(reference.identifier, newVariableName);
			}
		}
	}
}

module.exports = renameVariable;
