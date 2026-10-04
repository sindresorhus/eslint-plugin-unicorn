import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from '../ast/index.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

/**
Get the function that an identifier refers to, when it is declared in the same file and never reassigned.

This is a `function` declaration, or a variable (not destructured) initialized with a function or arrow expression. TypeScript wrappers around the initializer are unwrapped. Returns `undefined` for anything else, including variables with more than one declaration (like TypeScript overloads) and variables that are written after their declaration.

@param {import('estree').Node} node - The identifier. Any other node returns `undefined`.
@param {import('eslint').Rule.RuleContext} context
@returns {import('estree').Function | undefined}

@example
```
const callback = (value, index) => value;
array.map(callback);
//        ^^^^^^^^ Returns the arrow function
```
*/
export default function getFunctionFromIdentifier(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		variable?.defs.length !== 1
		|| variable.references.some(reference => reference.isWrite() && !reference.init)
	) {
		return;
	}

	const [definition] = variable.defs;
	if (definition.type === 'FunctionName') {
		// `declare function` and overload signatures have no body
		return isFunction(definition.node) ? definition.node : undefined;
	}

	if (
		definition.type === 'Variable'
		&& definition.node.id === definition.name
		// `init` is `null` for `let foo;` and `declare const foo`
		&& definition.node.init
	) {
		const initializer = unwrapTypeScriptExpression(definition.node.init);
		if (isFunction(initializer)) {
			return initializer;
		}
	}
}
