/*
Based on https://github.com/eslint/eslint/pull/20132
Workaround for https://github.com/typescript-eslint/typescript-eslint/issues/11762
*/

import {Variable} from 'eslint-scope';
import typescriptEslintParserOriginal from '@typescript-eslint/parser';
import babelEslintParserOriginal from '@babel/eslint-parser';

function addGlobals(names) {
	const globalScope = this.scopes[0];
	for (const name of names) {
		let variable = globalScope.set.get(name);

		if (variable) {
			continue;
		}

		variable = new Variable(name, globalScope);

		globalScope.variables.push(variable);
		globalScope.set.set(name, variable);
	}

	/*
	 * "through" contains all references which definitions cannot be found.
	 * Since we augment the global scope we need to update references
	 * and remove the ones that were added.
	 *
	 * Also, typescript-eslint's scope manager doesn't resolve references
	 * to global `var` and `function` variables, so we'll resolve _all_
	 * references to variables that exist in the global scope.
	 */
	globalScope.through = globalScope.through.filter(reference => {
		const {name} = reference.identifier;
		const variable = globalScope.set.get(name);

		if (variable) {
			/*
			 * Links the variable and the reference.
			 * And this reference is removed from `Scope#through`.
			 */
			reference.resolved = variable;
			variable.references.push(reference);

			return false;
		}

		return true;
	});

	/*
	 * "implicit" contains information about implicit global variables (those created
	 * implicitly by assigning values to undeclared variables in non-strict code).
	 * Since we augment the global scope, we need to remove the ones that were added.
	 */
	const {implicit} = globalScope;
	implicit.variables = implicit.variables.filter(variable => {
		const {name} = variable;
		if (globalScope.set.has(name)) {
			implicit.set.delete(name);
			return false;
		}

		return true;
	});

	// Typescript-eslint's scope manager doesn't produce "implicit.left"
}

function fixParse(parse) {
	return function parseForESLint(...arguments_) {
		const result = parse(...arguments_);

		result.scopeManager.addGlobals = addGlobals;

		return result;
	};
}

export const typescriptEslintParser = {
	...typescriptEslintParserOriginal,
	parseForESLint: fixParse(typescriptEslintParserOriginal.parseForESLint),
};

export const babelEslintParser = {
	...babelEslintParserOriginal,
	parseForESLint: fixParse(babelEslintParserOriginal.parseForESLint),
};
