/*
Based on https://github.com/eslint/eslint/pull/20132
Workaround for https://github.com/typescript-eslint/typescript-eslint/issues/11762
*/

import {createRequire} from 'node:module';
import {Variable} from 'eslint-scope';

const loadModule = createRequire(import.meta.url);
const typescriptEslintParserOriginal = loadModule('@typescript-eslint/parser');
const vueEslintParserOriginal = loadModule('vue-eslint-parser');
const htmlEslintParserOriginal = loadModule('@html-eslint/parser');

function addGlobals(scopeManager, names) {
	const globalScope = scopeManager.scopes[0];
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

	// The typescript-eslint scope manager doesn't produce "implicit.left"
}

function fixParse(parse) {
	return function (...arguments_) {
		const result = parse(...arguments_);

		if (result.scopeManager) {
			result.scopeManager.addGlobals ??= names => {
				addGlobals(result.scopeManager, names);
			};
		}

		return result;
	};
}

function getParser(name, parserModule) {
	const parser = parserModule.default ?? parserModule;

	// Some parser packages expose parseForESLint directly on the module, others only on parse.
	const parserForESLint = parser.parseForESLint ?? parser.parse;
	if (typeof parserForESLint !== 'function') {
		throw new TypeError(`Expected ${name} parser to expose parseForESLint.`);
	}

	return {
		...parser,
		parseForESLint: fixParse(parserForESLint),
	};
}

export const typescriptEslintParser = getParser('TypeScript', typescriptEslintParserOriginal);

export const vueEslintParser = getParser('Vue', vueEslintParserOriginal);

export const htmlEslintParser = getParser('HTML', htmlEslintParserOriginal);
