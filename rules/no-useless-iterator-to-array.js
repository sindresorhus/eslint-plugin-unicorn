import typedArray from './shared/typed-array.js';
import {unwrapExpression} from './shared/iterator-helpers.js';
import {removeMethodCall} from './fix/index.js';
import {
	isNewExpression,
	isMethodCall,
} from './ast/index.js';

const MESSAGE_ID_ITERABLE_ACCEPTING = 'iterable-accepting';
const MESSAGE_ID_FOR_OF = 'for-of';
const MESSAGE_ID_YIELD_STAR = 'yield-star';
const MESSAGE_ID_SPREAD = 'spread';
const MESSAGE_ID_ITERATOR_METHOD = 'iterator-method';
const MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING = 'iterable-accepting/suggestion';
const MESSAGE_ID_SUGGESTION_ITERATOR_METHOD = 'iterator-method/suggestion';

const messages = {
	[MESSAGE_ID_ITERABLE_ACCEPTING]: '`{{description}}` accepts an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_FOR_OF]: '`for…of`/`for await…of` can iterate over an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_YIELD_STAR]: '`yield*` can delegate to an iterable, `.toArray()` is unnecessary.',
	[MESSAGE_ID_SPREAD]: 'Spread works on iterables, `.toArray()` is unnecessary.',
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

// `reduce` — both Array and Iterator accept (callback, initialValue).
const reduceMethod = 'reduce';

const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});

const getRemoveToArrayFix = (toArrayCall, context) => {
	if (context.sourceCode.getCommentsInside(toArrayCall).length > 0) {
		return;
	}

	return fixer => removeMethodCall(fixer, toArrayCall, context);
};

const getRemoveToArraySuggestion = (toArrayCall, context, messageId, data) => {
	const fix = getRemoveToArrayFix(toArrayCall, context);
	if (!fix) {
		return;
	}

	return {
		messageId,
		...(data && {data}),
		fix,
	};
};

const getArrayFromProblem = (node, context) => {
	if (
		!isMethodCall(node, {
			objects: ['Array', ...typedArray],
			method: 'from',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isToArrayCall(node.arguments[0])
	) {
		return;
	}

	const toArrayCall = node.arguments[0];
	const fix = node.arguments.length === 1 ? getRemoveToArrayFix(toArrayCall, context) : undefined;
	const suggestion = node.arguments.length > 1
		? getRemoveToArraySuggestion(toArrayCall, context, MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING)
		: undefined;

	return {
		node: toArrayCall.callee.property,
		messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
		data: {description: `${node.callee.object.name}.${node.callee.property.name}(…)`},
		...(fix && {fix}),
		...(suggestion && {suggest: [suggestion]}),
	};
};

const getObjectFromEntriesProblem = (node, context) => {
	if (
		!isMethodCall(node, {
			object: 'Object',
			method: 'fromEntries',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isToArrayCall(node.arguments[0])
	) {
		return;
	}

	const toArrayCall = node.arguments[0];
	const fix = node.arguments.length === 1 ? getRemoveToArrayFix(toArrayCall, context) : undefined;
	const suggestion = node.arguments.length > 1
		? getRemoveToArraySuggestion(toArrayCall, context, MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING)
		: undefined;

	return {
		node: toArrayCall.callee.property,
		messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
		data: {description: `${node.callee.object.name}.${node.callee.property.name}(…)`},
		...(fix && {fix}),
		...(suggestion && {suggest: [suggestion]}),
	};
};

const getPromiseProblem = (node, context) => {
	// Suggestion only — passing an iterator directly can change a sync throw
	// into an async rejection when iteration fails.
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
	const suggestion = getRemoveToArraySuggestion(toArrayCall, context, MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING);

	return {
		node: toArrayCall.callee.property,
		messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
		data: {description: `${node.callee.object.name}.${node.callee.property.name}(…)`},
		...(suggestion && {suggest: [suggestion]}),
	};
};

const canObserveArrayArgument = (callback, arrayParameterIndex, context) => {
	if (!callback) {
		return false;
	}

	callback = unwrapExpression(callback);

	if (
		callback.type === 'ArrowFunctionExpression'
		|| callback.type === 'FunctionExpression'
	) {
		return callback.params.length > arrayParameterIndex
			|| callback.params.at(-1)?.type === 'RestElement'
			|| (
				callback.type === 'FunctionExpression'
				&& context.sourceCode.getTokens(callback).some(token => token.type === 'Identifier' && token.value === 'arguments')
			);
	}

	return false;
};

const getIteratorMethodProblem = (node, context) => {
	if (
		!(
			isMethodCall(node, {
				methods: callbackOnlyIteratorMethods,
				maximumArguments: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| isMethodCall(node, {
				method: reduceMethod,
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
		)
		|| !isToArrayCall(node.callee.object)
	) {
		return;
	}

	// If the callback is a function/arrow with enough parameters to reference
	// the `array` argument, `.toArray()` may be intentional.
	const callback = node.arguments[0];
	const method = node.callee.property.name;
	const isReduceCall = method === reduceMethod;
	const arrayParameterIndex = isReduceCall ? 3 : 2;
	if (canObserveArrayArgument(callback, arrayParameterIndex, context)) {
		return;
	}

	const toArrayCall = node.callee.object;
	const suggestion = getRemoveToArraySuggestion(toArrayCall, context, MESSAGE_ID_SUGGESTION_ITERATOR_METHOD, {method});

	return {
		node: toArrayCall.callee.property,
		messageId: MESSAGE_ID_ITERATOR_METHOD,
		data: {method},
		...(suggestion && {suggest: [suggestion]}),
	};
};

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
		const fix = node.arguments.length === 1 ? getRemoveToArrayFix(toArrayCall, context) : undefined;
		const suggestion = node.arguments.length > 1
			? getRemoveToArraySuggestion(toArrayCall, context, MESSAGE_ID_SUGGESTION_ITERABLE_ACCEPTING)
			: undefined;

		return {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID_ITERABLE_ACCEPTING,
			data: {description: `new ${node.callee.name}(…)`},
			...(fix && {fix}),
			...(suggestion && {suggest: [suggestion]}),
		};
	});

	// Case 2: Call expressions — static methods and iterator prototype methods.
	context.on('CallExpression', node =>
		getArrayFromProblem(node, context)
		?? getObjectFromEntriesProblem(node, context)
		?? getPromiseProblem(node, context)
		?? getIteratorMethodProblem(node, context));

	// Case 3: `for (const x of iterator.toArray())`
	context.on('ForOfStatement', node => {
		if (!isToArrayCall(node.right)) {
			return;
		}

		const fix = getRemoveToArrayFix(node.right, context);

		return {
			node: node.right.callee.property,
			messageId: MESSAGE_ID_FOR_OF,
			...(fix && {fix}),
		};
	});

	// Case 4: `yield* iterator.toArray()`
	context.on('YieldExpression', node => {
		if (!node.delegate || !isToArrayCall(node.argument)) {
			return;
		}

		const fix = getRemoveToArrayFix(node.argument, context);

		return {
			node: node.argument.callee.property,
			messageId: MESSAGE_ID_YIELD_STAR,
			...(fix && {fix}),
		};
	});

	// Case 5: `[...iterator.toArray()]`, `call(...iterator.toArray())`
	// Spread works on iterables — `.toArray()` is unnecessary.
	context.on('SpreadElement', node => {
		if (!isToArrayCall(node.argument)) {
			return;
		}

		const {parent} = node;
		if (
			parent.type !== 'ArrayExpression'
			&& parent.type !== 'CallExpression'
			&& parent.type !== 'NewExpression'
		) {
			return;
		}

		const fix = getRemoveToArrayFix(node.argument, context);

		return {
			node: node.argument.callee.property,
			messageId: MESSAGE_ID_SPREAD,
			...(fix && {fix}),
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
		languages: [
			'js/js',
		],
	},
};

export default config;
