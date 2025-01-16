'use strict';
const {checkVueTemplate} = require('./utils/rule.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {replaceNodeOrTokenAndSpacesBefore, fixSpaceAroundKeyword} = require('./fix/index.js');

const isInstanceofToken = token => token.value === 'instanceof' && token.type === 'Keyword';

const MESSAGE_ID = 'no-instanceof-builtin-object';
const messages = {
	[MESSAGE_ID]: 'Unsafe instanceof should not be used to check type.',
};

const primitiveConstructors = new Set(['String', 'Number', 'Boolean', 'BigInt', 'Symbol']);

const referenceConstructors = new Set([
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
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').BinaryExpression} node */
		'BinaryExpression[operator="instanceof"]'(node) {
			if (node.right.type !== 'Identifier') {
				return;
			}

			const {left, right} = node;

			let tokenStore = sourceCode;
			let instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);
			if (!instanceofToken && sourceCode.parserServices.getTemplateBodyTokenStore) {
				tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore();
				instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);
			}

			if (primitiveConstructors.has(right.name)) {
				// Check if the node is in a Vue template expression
				const vueExpressionContainer = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'VExpressionContainer');

				// Get safe quote
				const safeQuote = vueExpressionContainer ? (sourceCode.getText(vueExpressionContainer)[0] === '"' ? '\'' : '"') : '\'';

				context.report({
					node,
					messageId: MESSAGE_ID,
					* fix(fixer) {
						yield * fixSpaceAroundKeyword(fixer, node, sourceCode);

						const leftRange = getParenthesizedRange(left, tokenStore);
						yield fixer.insertTextBeforeRange(leftRange, 'typeof ');

						yield fixer.replaceText(instanceofToken, '===');

						const rightRange = getParenthesizedRange(right, tokenStore);

						yield fixer.replaceTextRange(rightRange, safeQuote + sourceCode.getText(right).toLowerCase() + safeQuote);
					},
				});
			} else if (referenceConstructors.has(right.name)) {
				if (right.name === 'Array') {
					context.report({
						node,
						messageId: MESSAGE_ID,
						* fix(fixer) {
							yield * fixSpaceAroundKeyword(fixer, node, sourceCode);

							const range = getParenthesizedRange(left, tokenStore);
							yield fixer.insertTextBeforeRange(range, 'Array.isArray(');
							yield fixer.insertTextAfterRange(range, ')');

							yield * replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, sourceCode, tokenStore);
							yield * replaceNodeOrTokenAndSpacesBefore(right, '', fixer, sourceCode, tokenStore);
						},
					});
				} else {
					context.report({node, messageId: MESSAGE_ID});
				}
			}
		},
	};
};

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
