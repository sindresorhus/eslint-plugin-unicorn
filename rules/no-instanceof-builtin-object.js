'use strict';
const {checkVueTemplate} = require('./utils/rule.js');

const MESSAGE_ID = 'no-instanceof-builtin-object';
const messages = {
	[MESSAGE_ID]: 'Unsafe instanceof should not be used to check type.',
};

const builtinConstructors = new Set([
	// Error types
	'AggregateError',
	'Error',
	'EvalError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'URIError',

	// Collection types
	'Map',
	'Set',
	'WeakMap',
	'WeakRef',
	'WeakSet',

	// Arrays and Typed Arrays
	'Array',
	'ArrayBuffer',
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray',

	// Data types
	'Boolean',
	'Number',
	'String',
	'Symbol',
	'BigInt',
	'Object',

	// Regular Expressions
	'RegExp',

	// Async and functions
	'Function',
	'Promise',
	'Proxy',

	// Other
	'DataView',
	'Date',
	'SharedArrayBuffer',
	'FinalizationRegistry',
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').BinaryExpression} node */
	'BinaryExpression[operator="instanceof"]'(node) {
		if (node.right.type !== 'Identifier') {
			return;
		}

		const {name} = node.right;

		if (builtinConstructors.has(name)) {
			if (name === 'Array') {
				context.report({
					node,
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, `Array.isArray(${context.sourceCode.getText(node.left)})`),
				});
			} else {
				context.report({node, messageId: MESSAGE_ID});
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create: checkVueTemplate(create),
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow instanceof on built-in objects',
			recommended: true,
		},
		fixable: 'code',
		defaultOptions: [],
		messages,
	},
};
