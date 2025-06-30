// @ts-check
import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction, isMemberExpression, isRegexLiteral} from './ast/index.js';

/**
 @typedef {any} Node
 */

// @ts-check
const MESSAGE_ID_ERROR = 'no-array-fill-with-reference-type/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Avoid using `{{actual}}` with reference type{{type}}. Use `Array.from({ ... }, () => { return independent instance })` instead to ensure no reference shared.',
};

const DEFAULTS = {
	// Not check for function expressions by default because it is rare to fill an array with a function and add properties to it.
	allowFunctions: true,
	// The same reason as above.
	allowRegularExpressions: true,
};

const debugging = false;
const log = (...arguments_) => debugging && console.log(...arguments_);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		// `arr.fill` or `new Array().fill` or `Array.from().fill`
		const isArrayFill = isMemberExpression(node.callee)
			&& ((node.callee.object.callee?.name === 'Array') || (context.sourceCode.getText(node.callee.object.callee) === 'Array.from'))
			&& node.callee.property.name === 'fill'
			&& node.arguments.length > 0;

		// `Array.from().map` or `Array.from(arrayLike, mapper)`
		const isArrayFrom = isMemberExpression(node.callee) && node.callee.object?.name === 'Array' && node.callee.property.name === 'from';
		log('isArrayFill:', {isArrayFill, isArrayFrom});

		if (!isArrayFill && !isArrayFrom) {
			return;
		}

		const fillArgument = isArrayFill ? node.arguments[0] : getArrayFromReturnNode(node, context);

		log('fillArgument:', fillArgument);

		if (!isReferenceType(fillArgument, context)) {
			return;
		}

		const actual = context.sourceCode.getText(node.callee.object.callee) === 'Array.from' ? 'Array.from().fill()' : 'Array.fill()';
		const type = getType(fillArgument, context);

		return {
			node: fillArgument,
			messageId: MESSAGE_ID_ERROR,
			data: {
				actual,
				type: type ? ` (${type})` : '',
			},
		};
	},
});

function getArrayFromReturnNode(node, context) {
	const secondArgument = node.arguments[1];
	log('secondArgument:', secondArgument);

	// Array.from({ length: 10 }, () => { return sharedObject; });
	let result;
	if (secondArgument && isFunction(secondArgument)) {
		result = getReturnIdentifier(secondArgument, context);
	} else if (node.parent.type === 'MemberExpression' && node.parent.property.name === 'map') {
		// Array.from({ length: 10 }).map(() => { return sharedObject; });
		result = getReturnIdentifier(node.parent.parent.arguments[0], context);
	}

	// Should not check reference type if the identifier is declared in the current function
	if (result?.declaredInCurrentFunction) {
		return;
	}

	const fillArgument = result?.returnNode;

	return fillArgument;
}

/**

 @param {Node} node - callback for map
 @returns {{ returnNode: Node, declaredInCurrentFunction: boolean }}
 */
function getReturnIdentifier(node, context) {
	if (node.type === 'Identifier') {
		const scope = context.sourceCode.getScope(node);

		const variable = findVariable(scope, node);

		if (!variable) {
			// Not check if the identifier is not declared
			return {returnNode: node, declaredInCurrentFunction: true};
		}

		// Must be ArrowFunctionExpression or FunctionExpression
		const {init} = variable.defs[0].node;

		if (!isFunction(init)) {
			// Not check if the identifier is not a function
			return {returnNode: node, declaredInCurrentFunction: true};
		}

		return getReturnIdentifier(init, context);
	}

	if (node.body.type === 'Identifier') {
		return {returnNode: node.body, declaredInCurrentFunction: false};
	}

	// Array.from({ length: 3 }, () => (new Map))
	// Array.from({ length: 3 }, () => ({}))
	// Array.from({ length: 3 }, () => {})
	if (!node.body.body) {
		return {returnNode: node.body, declaredInCurrentFunction: true};
	}

	const returnStatement = node.body.body.find(node => node.type === 'ReturnStatement');
	const name = returnStatement?.argument?.name;
	if (!name) {
		return {returnNode: returnStatement?.argument, declaredInCurrentFunction: true};
	}

	const declaredInCurrentFunction = node.body.body.some(node => node.type === 'VariableDeclaration' && node.declarations.some(declaration => declaration.id.name === name));

	return {returnNode: returnStatement?.argument, declaredInCurrentFunction};
}

/**

 @param {*} fillArgument
 @param {import('eslint').Rule.RuleContext} context
 @returns {string}
 */
function getType(fillArgument, context) {
	let type = '';

	switch (fillArgument.type) {
		case 'ObjectExpression': {
			type = 'Object';
			break;
		}

		case 'ArrayExpression': {
			type = 'Array';
			break;
		}

		case 'NewExpression': {
			type = getNewExpressionType(fillArgument, context);

			break;
		}

		case 'FunctionExpression':
		case 'ArrowFunctionExpression': {
			type = 'Function';
			break;
		}

		default: {
			if (fillArgument.type === 'Literal' && fillArgument.regex) {
				type = 'RegExp';
			} else if (fillArgument.type === 'Identifier') {
				type = `variable (${fillArgument.name})`;
			}
		}
	}

	return type;
}

/**

 @param {*} fillArgument
 @param {import('eslint').Rule.RuleContext} context
 @returns {string}
 */
function getNewExpressionType(fillArgument, context) {
	if (fillArgument.callee.name) {
		return `new ${fillArgument.callee.name}()`;
	}

	// NewExpression.callee not always have a name.
	// new A.B() and new class {}
	// Try the best to get the type from source code
	const matches = context.sourceCode.getText(fillArgument.callee).split('\n')[0].match(/\S+/);

	if (matches) {
		// Limit the length to avoid too long tips
		return 'new ' + matches[0].slice(0, 32);
	}

	return 'new ()';
}

/**
 @param {*} node
 @param {import('eslint').Rule.RuleContext} context
 @returns
 */
function isReferenceType(node, context) {
	if (!node) {
		return false;
	}

	/**
	 @type {typeof DEFAULTS}
	 */
	const options = {
		...DEFAULTS,
		...context.options[0],
	};

	// For null, number, string, boolean.
	if (node.type === 'Literal') {
		// Exclude regular expression literals (e.g., `/pattern/`, which are objects despite being literals).
		if (!options.allowRegularExpressions && isRegexLiteral(node)) {
			return true;
		}

		return false;
	}

	// For template literals.
	if (node.type === 'TemplateLiteral') {
		return false;
	}

	// For variable identifiers (recursively check its declaration).
	if (node.type === 'Identifier') {
		return isIdentifierReferenceType(node, context);
	}

	// Symbol (such as `Symbol('name')`)
	if (node.type === 'CallExpression' && node.callee.name === 'Symbol') {
		const {variables} = context.sourceCode.getScope(node);

		log('variables 2:', variables);
		if (!variables || variables.length === 0) {
			// Variable declaration not found; it might be a global variable.
			return false;
		}
	}

	if (options.allowFunctions && isFunction(node)) {
		return false;
	}

	const isNewRegexp = node.type === 'NewExpression' && node.callee.name === 'RegExp';
	if (options.allowRegularExpressions && isNewRegexp) {
		return false;
	}

	// Other cases: objects, arrays, new expressions, regular expressions, etc.
	return true;
}

/**
 Variable can be declared in its parent or grandparent scope so we need to check all the scopes up to the global scope.
 @param {{variableName: string; node: any; context: import('eslint').Rule.RuleContext}} params
 @returns
 */
function findVariableDefinition({variableName, node, context}) {
	if (!node) {
		return;
	}

	const scope = context.sourceCode.getScope(node);
	const {variables} = scope;
	const variable = variables.find(v => v.name === variableName);

	if (variable) {
		return variable;
	}

	return findVariableDefinition({variableName, node: node.parent, context});
}

/**

 @param {*} node
 @param {import('eslint').Rule.RuleContext} context
 @returns {boolean}
 */
function isIdentifierReferenceType(node, context) {
	const variable = findVariableDefinition({variableName: node.name, node, context});
	const definitionNode = variable?.defs[0]?.node;

	log({definitionNode});

	if (!variable || !definitionNode) {
		return false;
	}

	// Check `const foo = []; Array(3).fill(foo);`
	if (definitionNode.type === 'VariableDeclarator') {
		// Not check `let`
		if (definitionNode.parent.kind === 'let') {
			return false;
		}

		return isReferenceType(definitionNode.init, context);
	}

	return isReferenceType(definitionNode, context);
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowFunctions: {
				type: 'boolean',
			},
			allowRegularExpressions: {
				type: 'boolean',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallows using `Array.fill()` or `Array.from().fill()` with **reference types** to prevent unintended shared references across array elements.',
			recommended: true,
		},
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
