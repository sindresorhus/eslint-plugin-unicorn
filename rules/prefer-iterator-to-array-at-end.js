import {
	getCallExpressionArgumentsText,
	getCallExpressionTokens,
	getParenthesizedText,
	isParenthesized,
} from './utils/index.js';
import {isKnownNonIterator} from './shared/iterator-helpers.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-iterator-to-array-at-end';

const methods = [
	'filter',
	'flatMap',
	'map',
];

const messages = {
	[MESSAGE_ID]: 'Move `.toArray()` after `.{{method}}(…)`.',
};

const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});

// Array callbacks receive the `array` as a 3rd parameter, Iterator callbacks do not pass it
const canObserveArrayArgument = (node, context) => {
	// A callback that is not inline is opaque here, its parameter list is not visible, so it may read the third argument the rewrite would turn from an array into an iterator. This matches what `no-useless-iterator-to-array` does for the same shape.
	if (node?.type !== 'ArrowFunctionExpression' && node?.type !== 'FunctionExpression') {
		return true;
	}

	return (
		node.params.length > 2
		|| node.params.some(parameter => parameter.type === 'RestElement')
		// A `FunctionExpression` also exposes the passed arguments
		|| (
			node.type === 'FunctionExpression'
			&& context.sourceCode.getTokens(node).some(token => token.type === 'Identifier' && token.value === 'arguments')
		)
	);
};

const getReplacementText = (toArrayCall, methodCall, context, openingParenthesisToken) => {
	const {sourceCode} = context;
	const iteratorText = getParenthesizedText(toArrayCall.callee.object, context);
	const method = methodCall.callee.property.name;
	const argumentsText = getCallExpressionArgumentsText(context, methodCall);
	const [, methodNameEnd] = sourceCode.getRange(methodCall.callee.property);
	const [openingParenthesisStart] = sourceCode.getRange(openingParenthesisToken);
	const textBetweenMethodAndArguments = sourceCode.text.slice(methodNameEnd, openingParenthesisStart);

	return `${iteratorText}.${method}${textBetweenMethodAndArguments}(${argumentsText}).toArray()`;
};

const getFix = (toArrayCall, methodCall, context) => {
	const {sourceCode} = context;

	// The replacement text is rebuilt around the member access, so parentheses around it would be left behind without the code they wrapped
	if (isParenthesized(methodCall.callee, context)) {
		return;
	}

	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(methodCall, context);
	const [, methodNameEnd] = sourceCode.getRange(methodCall.callee.property);
	const [argumentsEnd] = sourceCode.getRange(closingParenthesisToken);

	if (sourceCode.getCommentsInside(methodCall).some(comment => {
		const [start, end] = sourceCode.getRange(comment);

		return start < methodNameEnd || end > argumentsEnd;
	})) {
		return;
	}

	return fixer => fixer.replaceText(methodCall, getReplacementText(toArrayCall, methodCall, context, openingParenthesisToken));
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods,
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isToArrayCall(node.callee.object)
			// `node.callee.object` is the `toArray()` call, its own receiver is what matters
			|| isKnownNonIterator(node.callee.object.callee.object, context)
			|| canObserveArrayArgument(node.arguments[0], context)
		) {
			return;
		}

		const method = node.callee.property.name;
		const toArrayCall = node.callee.object;
		const fix = getFix(toArrayCall, node, context);
		const problem = {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID,
			data: {method},
		};

		if (!fix) {
			return problem;
		}

		return {
			...problem,
			suggest: [
				{
					messageId: MESSAGE_ID,
					data: {method},
					fix,
				},
			],
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving `.toArray()` to the end of iterator helper chains.',
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
