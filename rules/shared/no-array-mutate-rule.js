import {isMethodCall} from '../ast/index.js';
import {getParenthesizedText} from '../utils/index.js';

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
			}),
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

function noArrayMutateRule(methodName) {
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

	/** @param {import('eslint').Rule.RuleContext} context */
	const create = context => {
		const {sourceCode} = context;
		const {allowExpressionStatement} = context.options[0];

		return {
			CallExpression(callExpression) {
				if (!predicate(callExpression)) {
					return;
				}

				const array = callExpression.callee.object;

				// `[...array].reverse()`
				const isSpreadAndMutate = array.type === 'ArrayExpression'
					&& array.elements.length === 1
					&& array.elements[0].type === 'SpreadElement';

				if (allowExpressionStatement && !isSpreadAndMutate) {
					const maybeExpressionStatement = callExpression.parent.type === 'ChainExpression'
						? callExpression.parent.parent
						: callExpression.parent;
					if (maybeExpressionStatement.type === 'ExpressionStatement') {
						return;
					}
				}

				const methodProperty = callExpression.callee.property;
				const suggestions = [];
				const fixMethodName = fixer => fixer.replaceText(methodProperty, replacement);

				/*
				For `[...array].reverse()`, provide two suggestions, let user choose if the object can be unwrapped,
				otherwise only change `.reverse()` to `.toReversed()`
				*/
				if (isSpreadAndMutate) {
					suggestions.push({
						messageId: MESSAGE_ID_SUGGESTION_SPREADING_ARRAY,
						* fix(fixer) {
							const text = getParenthesizedText(array.elements[0].argument, sourceCode);
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
			},
		};
	};

	/** @type {import('eslint').Rule.RuleModule} */
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
		},
	};

	return config;
}

export default noArrayMutateRule;
