import {isMethodCall} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';

const MESSAGE_ID = 'prefer-iterator-to-array-at-end';

const messages = {
	[MESSAGE_ID]: 'Move `.toArray()` to the end of the iterator chain; use `Iterator#{{method}}()` instead of `Array#{{method}}()`.',
};

// These methods exist on Iterator.prototype and return an Iterator, not an array.
// Note: flatMap is excluded because Iterator#flatMap requires the callback to return an iterable,
// while Array#flatMap accepts any return value.
const iteratorMethods = [
	'filter',
	'map',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods: iteratorMethods,
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isMethodCall(node.callee.object, {
				method: 'toArray',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
		) {
			return;
		}

		// Iterator#filter/map call the callback with two arguments (element, index).
		// Array versions also pass a third argument (the array reference). If the callback
		// declares more than two parameters, the third (array) would be `undefined`
		// after the fix, so skip.
		const callback = node.arguments[0];
		if (
			callback
			&& (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
			&& callback.params.length > 2
		) {
			return;
		}

		const toArrayCall = node.callee.object;

		return {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID,
			data: {method: node.callee.property.name},
			* fix(fixer) {
				yield removeMethodCall(fixer, toArrayCall, context);
				yield fixer.insertTextAfter(node, '.toArray()');
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce calling `.toArray()` at the end of an iterator method chain.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
