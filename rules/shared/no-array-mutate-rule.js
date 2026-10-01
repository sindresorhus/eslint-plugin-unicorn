import {isMethodCall} from '../ast/index.js';
import {
	getParenthesizedText,
	isNodeValueNotFunction,
	isParenthesized,
	shouldAddParenthesesToMemberExpressionObject,
	shouldSkipKnownNonArrayReceiver,
} from '../utils/index.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION_APPLY_REPLACEMENT = 'suggestion-apply-replacement';
const MESSAGE_ID_SUGGESTION_SPREADING_ARRAY = 'suggestion-spreading-array';
const MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY = 'suggestion-not-spreading-array';

const methods = new Map([
	[
		'reverse',
		{
			replacement: 'toReversed',
			predicate: callExpression => isMethodCall(callExpression, {
				method: 'reverse',
				argumentsLength: 0,
				optionalCall: false,
			}),
		},
	],
	[
		'sort',
		{
			replacement: 'toSorted',
			predicate: callExpression => isMethodCall(callExpression, {
				method: 'sort',
				maximumArguments: 1,
				optionalCall: false,
			})
			&& !(callExpression.arguments[0] && isNodeValueNotFunction(callExpression.arguments[0])),
		},
	],
]);

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowExpressionStatement: {
				type: 'boolean',
			},
		},
	},
];

// Unwrapping `[...argument]` replaces the whole array literal, so any comment in the brackets that is not inside the argument itself would be lost.
const hasCommentOutsideArgument = (array, context) => {
	const {sourceCode} = context;
	const [argumentStart, argumentEnd] = sourceCode.getRange(array.elements[0].argument);
	return sourceCode.getCommentsInside(array).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart < argumentStart || commentEnd > argumentEnd;
	});
};

export default function noArrayMutateRule(methodName) {
	const {
		replacement,
		predicate,
	} = methods.get(methodName);

	const messages = {
		[MESSAGE_ID_ERROR]: `Use \`Array#${replacement}()\` instead of \`Array#${methodName}()\`.`,
		[MESSAGE_ID_SUGGESTION_APPLY_REPLACEMENT]: `Switch to \`.${replacement}()\`.`,
		[MESSAGE_ID_SUGGESTION_SPREADING_ARRAY]: 'The spreading object is an array.',
		[MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY]: 'The spreading object is NOT an array.',
	};

	/**
	@param {import('eslint').Rule.RuleContext} context
	*/
	const create = context => {
		const {allowExpressionStatement} = context.options[0];

		context.on('CallExpression', callExpression => {
			if (!predicate(callExpression)) {
				return;
			}

			const array = callExpression.callee.object;

			// `[...array].reverse()`
			const isSpreadAndMutate = array.type === 'ArrayExpression'
				&& array.elements.length === 1
				// A lone hole (`[,]`) has no element node
				&& array.elements[0]?.type === 'SpreadElement';

			if (allowExpressionStatement && !isSpreadAndMutate) {
				const maybeExpressionStatement = callExpression.parent.type === 'ChainExpression'
					? callExpression.parent.parent
					: callExpression.parent;
				if (maybeExpressionStatement.type === 'ExpressionStatement') {
					return;
				}
			}

			// Skip receivers known to be neither an array nor a typed array (e.g. a typed `Set`). Resolving the receiver type is expensive, so it runs after the cheap checks.
			if (shouldSkipKnownNonArrayReceiver(array, context)) {
				return;
			}

			const methodProperty = callExpression.callee.property;
			const suggestions = [];
			const fixMethodName = fixer => fixer.replaceText(methodProperty, replacement);

			/*
			For `[...array].reverse()`, provide two suggestions, let user choose if the object can be unwrapped,
			otherwise only change `.reverse()` to `.toReversed()`
			*/
			if (isSpreadAndMutate && !hasCommentOutsideArgument(array, context)) {
				suggestions.push({
					messageId: MESSAGE_ID_SUGGESTION_SPREADING_ARRAY,
					* fix(fixer) {
						const {argument} = array.elements[0];
						let text = getParenthesizedText(argument, context);

						// The unwrapped argument becomes the object of `.toReversed()`/`.toSorted()`,
						// so wrap low-precedence expressions (e.g. `[...a + b]`) to keep parsing intact.
						if (
							!isParenthesized(argument, context)
							&& shouldAddParenthesesToMemberExpressionObject(argument, context)
						) {
							text = `(${text})`;
						}

						yield fixer.replaceText(array, text);
						yield fixMethodName(fixer);
					},
				});
			}

			suggestions.push({
				messageId: isSpreadAndMutate
					? MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY
					: MESSAGE_ID_SUGGESTION_APPLY_REPLACEMENT,
				fix: fixMethodName,
			});

			return {
				node: methodProperty,
				messageId: MESSAGE_ID_ERROR,
				suggest: suggestions,
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
				description: `Prefer \`Array#${replacement}()\` over \`Array#${methodName}()\`.`,
				recommended: 'unopinionated',
			},
			hasSuggestions: true,
			schema,
			defaultOptions: [{allowExpressionStatement: true}],
			messages,
			languages: [
				'js/js',
			],
		},
	};

	return config;
}
