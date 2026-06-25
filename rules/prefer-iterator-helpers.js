import {
	getParenthesizedRange,
	getParenthesizedText,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';
import {
	isIteratorExpression,
	unwrapExpression,
} from './shared/iterator-helpers.js';

const MESSAGE_ID = 'prefer-iterator-helpers';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-helpers/suggestion';

const callbackOnlyIteratorMethods = [
	'every',
	'find',
	'forEach',
	'some',
];

const reduceMethod = 'reduce';

const messages = {
	[MESSAGE_ID]: 'Prefer `Iterator#{{method}}()` over materializing an array.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Iterator#{{method}}()`.',
};

const isTargetArrayMethodCall = node => (
	isMethodCall(node, {
		methods: callbackOnlyIteratorMethods,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	|| isMethodCall(node, {
		method: reduceMethod,
		minimumArguments: 1,
		maximumArguments: 2,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
);

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

const hasCommentsOutsideIterator = (temporaryArray, iterator, context) => {
	const [iteratorStart, iteratorEnd] = getParenthesizedRange(iterator, context);

	return context.sourceCode.getCommentsInside(temporaryArray).some(comment => {
		const [commentStart, commentEnd] = context.sourceCode.getRange(comment);

		return commentStart < iteratorStart || commentEnd > iteratorEnd;
	});
};

const getIteratorFromSpreadArray = (node, context) => {
	const [spreadElement] = node.elements;
	if (
		node.elements.length !== 1
		|| spreadElement?.type !== 'SpreadElement'
		|| !isIteratorExpression(spreadElement.argument, context)
	) {
		return;
	}

	return spreadElement.argument;
};

const getIteratorFromArrayFrom = (node, context) => {
	if (!isMethodCall(node, {
		object: 'Array',
		method: 'from',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})) {
		return;
	}

	const [iterator] = node.arguments;
	if (!isIteratorExpression(iterator, context)) {
		return;
	}

	return iterator;
};

const getIteratorFromTemporaryArray = (node, context) => {
	if (node.type === 'ArrayExpression') {
		return getIteratorFromSpreadArray(node, context);
	}

	if (node.type === 'CallExpression') {
		return getIteratorFromArrayFrom(node, context);
	}
};

const getSuggestion = (temporaryArray, iterator, context, method) => {
	if (hasCommentsOutsideIterator(temporaryArray, iterator, context)) {
		return;
	}

	const iteratorText = getParenthesizedText(iterator, context);
	const replacement = (
		!isParenthesized(iterator, context)
		&& shouldAddParenthesesToMemberExpressionObject(iterator, context)
	)
		? `(${iteratorText})`
		: iteratorText;
	const semicolon = needsSemicolon(context.sourceCode.getTokenBefore(temporaryArray), context, replacement) ? ';' : '';

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {method},
		fix: fixer => fixer.replaceText(temporaryArray, semicolon + replacement),
	};
};

const getProblem = (temporaryArray, iterator, context, method) => {
	const suggestion = getSuggestion(temporaryArray, iterator, context, method);

	return {
		node: temporaryArray,
		messageId: MESSAGE_ID,
		data: {method},
		...(suggestion && {suggest: [suggestion]}),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isTargetArrayMethodCall(node)) {
			return;
		}

		const method = node.callee.property.name;
		const arrayParameterIndex = method === reduceMethod ? 3 : 2;
		if (canObserveArrayArgument(node.arguments[0], arrayParameterIndex, context)) {
			return;
		}

		const temporaryArray = node.callee.object;
		const iterator = getIteratorFromTemporaryArray(temporaryArray, context);
		if (!iterator) {
			return;
		}

		return getProblem(temporaryArray, iterator, context, method);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer iterator helpers over temporary arrays from iterators.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
