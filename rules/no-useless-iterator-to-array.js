import typedArray from './shared/typed-array.js';
import {removeMethodCall} from './fix/index.js';
import {
	isNewExpression,
	isMethodCall,
} from './ast/index.js';

const MESSAGE_ID_ITERABLE_ACCEPTING = 'iterable-accepting';
const MESSAGE_ID_FOR_OF = 'for-of';
const MESSAGE_ID_YIELD_STAR = 'yield-star';
const MESSAGE_ID_ITERATOR_METHOD = 'iterator-method';
const MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING = 'iterable-accepting/suggestion';
const MESSAGE_ID_SUGGESTION_ITERATOR_METHOD = 'iterator-method/suggestion';

const messages = {
	[MESSAGE_ID_ITERABLE_ACCEPTING]: '`{{description}}` accepts an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_FOR_OF]: '`for…of` can iterate over an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_YIELD_STAR]: '`yield*` can delegate to an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_ITERATOR_METHOD]: '`Iterator` has a `.{{method}}()` method, `.toArray()` is unnecessary.',
	[MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING]: 'Remove `.toArray()`.',
	[MESSAGE_ID_SUGGESTION_ITERATOR_METHOD]: 'Remove `.toArray()` and use `Iterator#{{method}}()`.',
};

// Iterator methods that share semantics with Array methods.
// Excluded: filter, flatMap, map — these return Iterator, not Array.
// Methods where Array accepts `thisArg` but Iterator does not:
const callbackOnlyIteratorMethods = [
	'every',
	'find',
	'forEach',
	'some',
];

// `reduce` — both Array and Iterator accept (callback, initialValue),
// but Array.reduce without initialValue uses the first element while
// Iterator.reduce without initialValue throws.
const reduceMethod = 'reduce';

const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// Case 1: `new Set(iterator.toArray())`, `new Map(iterator.toArray())`, etc.
	context.on('NewExpression', node => {
		if (
			!(
				isNewExpression(node, {names: ['Map', 'WeakMap', 'Set', 'WeakSet'], argumentsLength: 1})
				|| isNewExpression(node, {names: typedArray, minimumArguments: 1})
			)
			|| !isToArrayCall(node.arguments[0])
		) {
			return;
		}

		const toArrayCall = node.arguments[0];

		return {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
			data: {description: `new ${node.callee.name}(…)`},
			fix: fixer => removeMethodCall(fixer, toArrayCall, context),
		};
	});

	// Case 2a: `Array.from(iterator.toArray())`, `Object.fromEntries(iterator.toArray())`, etc.
	// These are safe to autofix — no behavioral difference.
	context.on('CallExpression', node => {
		const isSafeIterableAcceptingMethod
			= isMethodCall(node, {
				objects: ['Array', ...typedArray],
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| isMethodCall(node, {
				object: 'Object',
				method: 'fromEntries',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			});

		if (!isSafeIterableAcceptingMethod || !isToArrayCall(node.arguments[0])) {
			return;
		}

		const toArrayCall = node.arguments[0];

		return {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
			data: {description: `${node.callee.object.name}.${node.callee.property.name}(…)`},
			fix: fixer => removeMethodCall(fixer, toArrayCall, context),
		};
	});

	// Case 2b: `Promise.all(iterator.toArray())`, etc.
	// Suggestion only — passing an iterator directly can change a sync throw
	// into an async rejection when iteration fails.
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				object: 'Promise',
				methods: ['all', 'allSettled', 'any', 'race'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isToArrayCall(node.arguments[0])
		) {
			return;
		}

		const toArrayCall = node.arguments[0];

		return {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
			data: {description: `${node.callee.object.name}.${node.callee.property.name}(…)`},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING,
					fix: fixer => removeMethodCall(fixer, toArrayCall, context),
				},
			],
		};
	});

	// Case 3: `for (const x of iterator.toArray())`
	context.on('ForOfStatement', node => {
		if (!isToArrayCall(node.right)) {
			return;
		}

		return {
			node: node.right.callee.property,
			messageId: MESSAGE_ID_FOR_OF,
			fix: fixer => removeMethodCall(fixer, node.right, context),
		};
	});

	// Case 4: `yield* iterator.toArray()`
	context.on('YieldExpression', node => {
		if (!node.delegate || !isToArrayCall(node.argument)) {
			return;
		}

		return {
			node: node.argument.callee.property,
			messageId: MESSAGE_ID_YIELD_STAR,
			fix: fixer => removeMethodCall(fixer, node.argument, context),
		};
	});

	// Case 5: `iterator.toArray().every(fn)`, `iterator.toArray().find(fn)`, etc.
	// Suggestion only — Array callbacks receive a 3rd `array` argument
	// (and `reduce` a 4th) that Iterator callbacks do not.
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods: callbackOnlyIteratorMethods,
				maximumArguments: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& !isMethodCall(node, {
				method: reduceMethod,
				minimumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
		) {
			return;
		}

		const callerObject = node.callee.object;
		if (!isToArrayCall(callerObject)) {
			return;
		}

		return {
			node: callerObject.callee.property,
			messageId: MESSAGE_ID_ITERATOR_METHOD,
			data: {method: node.callee.property.name},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION_ITERATOR_METHOD,
					data: {method: node.callee.property.name},
					fix: fixer => removeMethodCall(fixer, callerObject, context),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `.toArray()` on iterators.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
