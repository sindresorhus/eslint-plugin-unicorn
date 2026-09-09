import {
	getParenthesizedRange,
	getParenthesizedText,
	getStaticValueForControlFlow,
	hasUnparenthesizedOptionalChainElement,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	isIteratorExpression,
	unwrapExpression,
} from './shared/iterator-helpers.js';

const MESSAGE_ID = 'prefer-iterator-helpers';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-helpers/suggestion';
const MESSAGE_ID_SLICE = 'prefer-iterator-helpers/slice';
const MESSAGE_ID_SLICE_SUGGESTION = 'prefer-iterator-helpers/slice-suggestion';

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
	[MESSAGE_ID_SLICE]: 'Prefer `{{replacement}}` before materializing the iterator instead of slicing the array.',
	[MESSAGE_ID_SLICE_SUGGESTION]: 'Use `{{replacement}}.toArray()`.',
};

const isTargetTerminalMethodCall = node => (
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

const hasCommentsOutsideIterator = (node, iterator, context) => {
	const [iteratorStart, iteratorEnd] = getParenthesizedRange(iterator, context);

	return context.sourceCode.getCommentsInside(node).some(comment => {
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

const getIteratorFromToArray = (node, context) => {
	if (
		node.type !== 'CallExpression'
		|| node.typeArguments
		|| node.typeParameters
		|| !isMethodCall(node, {
			method: 'toArray',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| hasUnparenthesizedOptionalChainElement(node, context)
	) {
		return;
	}

	return node.callee.object;
};

const getIteratorFromTemporaryArray = (node, context) => {
	if (node.type === 'ArrayExpression') {
		return getIteratorFromSpreadArray(node, context);
	}

	if (node.type === 'CallExpression') {
		return getIteratorFromArrayFrom(node, context);
	}
};

const getIteratorText = (iterator, context) => {
	const {sourceCode} = context;
	let iteratorText = getParenthesizedText(iterator, context);
	// Materialization ends optional chains and allows expressions that cannot start a statement.
	if (
		!isParenthesized(iterator, context)
		&& (
			iterator.type === 'ChainExpression'
			|| ['{', '<', 'function', 'class', 'async'].includes(sourceCode.getFirstToken(iterator).value)
			|| shouldAddParenthesesToMemberExpressionObject(iterator, context)
		)
	) {
		iteratorText = `(${iteratorText})`;
	}

	return iteratorText;
};

const getSuggestion = (node, iterator, {suffix = '', messageId, data}, context) => {
	if (hasCommentsOutsideIterator(node, iterator, context)) {
		return;
	}

	const text = getIteratorText(iterator, context) + suffix;
	const {sourceCode} = context;
	const semicolon = needsSemicolon(sourceCode.getTokenBefore(node), context, text) ? ';' : '';

	return {
		messageId,
		data,
		* fix(fixer) {
			yield fixer.replaceText(node, semicolon + text);
			yield fixSpaceAroundKeyword(fixer, node, context);
		},
	};
};

const getTerminalMethodProblem = (node, context) => {
	if (!isTargetTerminalMethodCall(node)) {
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

	const suggestion = getSuggestion(temporaryArray, iterator, {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {method},
	}, context);

	return {
		node: temporaryArray,
		messageId: MESSAGE_ID,
		data: {method},
		...(suggestion && {suggest: [suggestion]}),
	};
};

const getSliceHelperCalls = (node, context) => {
	const bounds = node.arguments.map(argument => getStaticValueForControlFlow(argument, context)?.value);
	if (bounds.some(bound => !(Number.isSafeInteger(bound) && bound >= 0))) {
		return;
	}

	const [start, end] = bounds;
	if (end !== undefined && end <= start) {
		return 'take(0)';
	}

	const calls = [];
	if (start > 0) {
		calls.push(`drop(${start})`);
	}

	if (end !== undefined) {
		calls.push(`take(${end - start})`);
	}

	return calls.join('.');
};

const getSliceProblem = (node, context) => {
	if (
		!isMethodCall(node, {
			method: 'slice',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		|| node.typeArguments
		|| node.typeParameters
	) {
		return;
	}

	const temporaryArray = node.callee.object;
	if (temporaryArray.type === 'CallExpression' && (temporaryArray.typeArguments || temporaryArray.typeParameters)) {
		return;
	}

	const iterator = getIteratorFromToArray(temporaryArray, context) ?? getIteratorFromTemporaryArray(temporaryArray, context);
	if (!iterator || iterator.type === 'Super') {
		return;
	}

	const replacement = getSliceHelperCalls(node, context);
	if (!replacement) {
		return;
	}

	const suggestion = getSuggestion(node, iterator, {
		suffix: `.${replacement}.toArray()`,
		messageId: MESSAGE_ID_SLICE_SUGGESTION,
		data: {replacement},
	}, context);
	return {
		node: node.callee.property,
		messageId: MESSAGE_ID_SLICE,
		data: {replacement},
		...(suggestion && {suggest: [suggestion]}),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => getSliceProblem(node, context) ?? getTerminalMethodProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
