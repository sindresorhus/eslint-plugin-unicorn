// @ts-check
import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isFunction,
	isMemberExpression,
	isMethodCall,
	isNewExpression,
	isRegexLiteral,
} from './ast/index.js';

// @ts-check
const MESSAGE_ID_ERROR = 'no-array-fill-with-reference-type/error';
const messages = {
	[MESSAGE_ID_ERROR]:
		'Avoid using `{{actual}}` with reference type{{type}}. Use `Array.from({ ... }, () => { return independent instance })` instead to ensure no reference shared.',
};

const DEFAULTS = {
	// Not check for function expressions by default because it is rare to fill an array with a function and add properties to it.
	allowFunctions: true,
	// The same reason as above.
	allowRegularExpressions: true,
};

const RECURSION_LIMIT = 5;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/**
	  @param {import('estree').CallExpression} node
	 */
	CallExpression(node) {
		// Check all `fill` method call even if the object is not Array because we don't know if its runtime type is array
		// `arr.fill()` or `new Array().fill()` or `Array.from().fill()`
		const isArrayFill = isMethodCall(node, {method: 'fill', argumentsLength: 1});

		// `Array.from().map` or `Array.from(arrayLike, mapper)`
		const isArrayFrom = isMethodCall(node, {object: 'Array', method: 'from'});

		if (!isArrayFill && !isArrayFrom) {
			return;
		}

		const fillArgument = isArrayFill
			? node.arguments[0]
			: getReturnNodeOfArrayDotFrom(node, context);

		const [is, resolvedNode] = isReferenceType(fillArgument, context);

		if (!is) {
			return;
		}

		const actual = isMethodCall(
			// @ts-expect-error
			node.callee.object,
			{object: 'Array', method: 'from'},
		)
			? 'Array.from().fill()'
			: 'Array.fill()';

		const type = getType(resolvedNode, context);

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

/**

 @param {import('estree').CallExpression} functionNode
 @param {RuleContext} context
 @returns
 */
function getReturnNodeOfArrayDotFrom(functionNode, context) {
	const secondArgument = functionNode.arguments[1];

	// Array.from({ length: 10 }, () => { return sharedObject; });
	let result;
	if (secondArgument && isFunction(secondArgument)) {
		result = getReturnIdentifier(secondArgument, context);
		// @ts-expect-error node always has a parent
	} else if (isMemberExpression(functionNode.parent, 'map')) {
		// Array.from({ length: 10 }).map(() => { return sharedObject; });
		// @ts-expect-error node always has a parent
		result = getReturnIdentifier(functionNode.parent.parent.arguments[0], context);
	}

	// Should not check reference type if the identifier is declared in the current function
	// or is global
	if (result?.declaredInCurrentFunction || result?.isGlobal) {
		return;
	}

	const fillArgument = result?.returnNode;

	return fillArgument;
}

/**

 @param {import('estree').FunctionExpression | Node} node - callback for map
 @param {RuleContext} context
 @returns {{ returnNode: Node, declaredInCurrentFunction: boolean, isGlobal?: boolean }}
 */
function getReturnIdentifier(node, context) {
	if (node.type === 'Identifier') {
		const scope = context.sourceCode.getScope(node);

		const variable = findVariable(scope, node);

		if (!variable) {
			// Not check if the identifier is not declared
			return {returnNode: node, declaredInCurrentFunction: false, isGlobal: true};
		}

		// Must be ArrowFunctionExpression or FunctionExpression
		const init = variable.defs[0]?.node?.init;

		// `init` will be undefined if the identifier is builtin globals like String
		if (!init || !isFunction(init)) {
			// Not check if the identifier is not a function
			return {returnNode: node, declaredInCurrentFunction: true};
		}

		return getReturnIdentifier(init, context);
	}

	// @ts-expect-error node is FunctionExpression
	const {body: nodeBody} = node;

	// No check member expression as callback `Array.from(element.querySelectorAll('ng2 li')).map(angular.element);`
	if (!nodeBody) {
		return {returnNode: node, declaredInCurrentFunction: true};
	}

	if (nodeBody.type === 'Identifier') {
		return {returnNode: nodeBody, declaredInCurrentFunction: false};
	}

	// Array.from({ length: 3 }, () => (new Map))
	// Array.from({ length: 3 }, () => ({}))
	// Array.from({ length: 3 }, () => {})
	if (!nodeBody.body) {
		return {returnNode: nodeBody, declaredInCurrentFunction: true};
	}

	// @ts-expect-error
	const returnStatement = nodeBody.body.find(node => node.type === 'ReturnStatement');

	// const list = Array.from({ length: 3 }, () => {
	//   return {} // <= the returnStatement  has no name or type !== 'Identifier' we can return here
	// });
	if (returnStatement?.argument?.type !== 'Identifier') {
		return {
			returnNode: returnStatement?.argument,
			declaredInCurrentFunction: true,
		};
	}

	const declaredInCurrentFunction = nodeBody.body.some(
		// @ts-expect-error
		node =>
			node.type === 'VariableDeclaration'
			// @ts-expect-error
			&& node.declarations.some(declaration => declaration.id.name === returnStatement?.argument?.name),
	);

	return {returnNode: returnStatement?.argument, declaredInCurrentFunction};
}

/**
 @param {*} fillArgument
 @param {import('eslint').Rule.RuleContext} context
 @returns {string}
 */
function getType(fillArgument, context) {
	switch (fillArgument.type) {
		case 'ObjectExpression': {
			return 'Object';
		}

		case 'ArrayExpression': {
			return 'Array';
		}

		case 'NewExpression': {
			return getNewExpressionType(fillArgument, context);
		}

		case 'FunctionExpression':
		case 'ArrowFunctionExpression': {
			return 'Function';
		}

		default: {
			if (fillArgument.type === 'Literal' && fillArgument.regex) {
				return 'RegExp';
			}

			if (fillArgument.type === 'Identifier') {
				return `variable (${fillArgument.name})`;
			}
		}
	}

	return '';
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
	const matches = context.sourceCode
		.getText(fillArgument.callee)
		.split('\n')[0]
		.match(/\S+/);

	if (matches) {
		// Limit the length to avoid too long tips
		return 'new ' + matches[0].slice(0, 32);
	}

	return 'new ()';
}

/**
 @param {undefined | Node} node
 @param {import('eslint').Rule.RuleContext} context
 @returns {[is: false] | [is: true, node: Node]}
 */
function isReferenceType(node, context) {
	if (!node) {
		return [false];
	}

	/** @type {typeof DEFAULTS} */
	const options = {
		...DEFAULTS,
		...context.options[0],
	};

	// For null, number, string, boolean.
	if (node.type === 'Literal') {
		// Exclude regular expression literals (e.g., `/pattern/`, which are objects despite being literals).
		if (!options.allowRegularExpressions && isRegexLiteral(node)) {
			return [true, node];
		}

		return [false];
	}

	// For template literals.
	if (node.type === 'TemplateLiteral') {
		return [false];
	}

	// For variable identifiers (recursively check its declaration).
	if (node.type === 'Identifier') {
		return isIdentifierReferenceType(node, context);
	}

	if (isSymbol(node)) {
		return [false];
	}

	if (options.allowFunctions && isFunction(node)) {
		return [false];
	}

	if (options.allowRegularExpressions && isNewExpression(node, 'RegExp')) {
		return [false];
	}

	if (isMemberExpression(node)) {
		const propertyNode = getMemberExpressionLeafNode(node, context);
		if (!propertyNode) {
			return [false];
		}

		return isReferenceType(propertyNode, context);
	}

	// Other cases: objects, arrays, new expressions, regular expressions, etc.
	return [true, node];
}

/**
 Get member expression leaf node
 like get nested object property in plain object but in ESLint AST Node
 @param {MemberExpression} node - The whole member expression node
 @param {RuleContext} context - ESLint rule context
 @returns {undefined | ESTreeNode} - The leaf node
 @example
 // pseudo code
 const obj = { a: { b: { c: { list: [] } } } };
 obj.a.b.c.list // => []
 */
function getMemberExpressionLeafNode(node, context) {
	const chain = getPropertyAccessChain(node);

	if (!chain || chain.length === 0) {
		return;
	}

	// The chain names: [ 'obj', 'a', 'b', 'c', 'list' ]
	// if the MemberExpression is `obj.a.b.c.list`

	// @ts-expect-error `chain[0].name` cannot be undefined because the previous check ensures
	const variable = findVariableDefinition({node, variableName: chain[0].name, context});
	if (!variable || !variable.defs[0]?.node) {
		return;
	}

	/** @type {ESTreeNode | undefined} */
	let currentObject = variable.defs[0].node.init;

	for (let index = 1; index < chain.length; index++) {
		const currentPropertyInChain = chain[index].property;
		if (!currentObject || currentObject.type !== 'ObjectExpression') {
			return;
		}

		const property = currentObject.properties.find(
			// @ts-expect-error
			property_ => property_.key.type === 'Identifier'
				// @ts-expect-error
				&& property_.key.name === (currentPropertyInChain.type === 'Identifier' ? currentPropertyInChain.name : currentPropertyInChain.value),
		);

		if (!property) {
			return;
		}

		// @ts-expect-error
		currentObject = property.value;
	}

	return currentObject;
}

/**
 Extracts the property access chain from a MemberExpression
 @param {MemberExpression | Identifier} node - The node to analyze
 @returns {PropertyAccessNode[] | undefined} - Array of access nodes or undefined if invalid
 @example
 return [ Node('obj'), Property('a'), Property('b'), Property('c'), Property('list') ] if node is MemberExpress `obj.a.b.c.list`
 */
function getPropertyAccessChain(node) {
	/** @type {PropertyAccessNode[]} */
	const chain = [];
	/** @type {MemberExpression | Identifier | null} */
	let current = node;
	let times = 0;

	// We use `unshift` because `obj.a.b.c.list` loop order is `list` -> `c` -> `b` -> `a` -> `obj`
	while (current) {
		times += 1;
		if (times > RECURSION_LIMIT) {
			return;
		}

		if (current.type === 'Identifier') {
			chain.unshift({name: current.name});
			// `break` at end of chain.
			break;
		}

		if (current.type === 'MemberExpression') {
			if (current.property.type === 'Identifier') {
				chain.unshift({property: current.property});
			} else if (current.property.type === 'Literal') {
				chain.unshift({property: current.property});
			} else {
				// Unsupported property type
				return;
			}

			// @ts-expect-error
			current = current.object;
		} else {
			// Unsupported node type
			return;
		}
	}

	return chain.length > 0 ? chain : undefined;
}

/**
 @param {any} node
 @returns {boolean}
 */
function isSymbol(node) {
	const SYMBOL = 'Symbol';
	// Symbol (such as `Symbol('description')`) will not check
	if (node.type === 'CallExpression' && node.callee.name === SYMBOL) {
		return true;
	}

	// Symbol (such as `Symbol.for('description')`) will not check
	if (isCallExpression(node) && node.callee.object?.name === SYMBOL) {
		return true;
	}

	// Symbol (such as `Symbol.iterator`) will not check
	if (isMemberExpression(node, {object: SYMBOL})) {
		return true;
	}

	return false;
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
 @returns {[is: false] | [is: true, node: Node]}
 */
function isIdentifierReferenceType(node, context) {
	const variable = findVariableDefinition({
		variableName: node.name,
		node,
		context,
	});
	const definitionNode = variable?.defs[0]?.node;

	if (!variable || !definitionNode) {
		return [false];
	}

	// Check `const foo = []; Array(3).fill(foo);`
	if (definitionNode.type === 'VariableDeclarator') {
		// Not check `let` `let foo = []; Array(3).fill(foo);`
		if (definitionNode.parent.kind === 'let') {
			return [false];
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
			description:
				'Disallows using `Array.fill()` or `Array.from().fill()` with **reference types** to prevent unintended shared references across array elements.',
			recommended: true,
		},
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;

/**
 @typedef {ESTreeNode} Node
 */

/**
 @typedef {Object} PropertyAccessNode
 @property {string} [name] - For identifiers (root object)
 @property {import('estree').Identifier | import('estree').Literal} [property] - For property access
 */

/**
 @typedef {import('eslint').Rule.RuleContext} RuleContext
 @typedef {import('estree').Node} ESTreeNode
 @typedef {import('estree').MemberExpression} MemberExpression
 @typedef {import('estree').Identifier} Identifier
 @typedef {import('estree').Literal} Literal
 @typedef {import('estree').VariableDeclarator} VariableDeclarator
 @typedef {import('estree').ObjectExpression} ObjectExpression
 @typedef {import('estree').Property} Property
 @typedef {import('eslint-scope').Variable} ESLintVariable
 */
