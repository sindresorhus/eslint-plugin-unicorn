import {isMethodCall} from './ast/index.js';
import {getParenthesizedText} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-array-reverse/error';
const MESSAGE_ID_SUGGESTION_ONLY_FIX_METHOD = 'no-array-reverse/suggestion-only-fix-method';
const MESSAGE_ID_SUGGESTION_SPREADING_ARRAY = 'no-array-reverse/suggestion-spreading-array';
const MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY = 'no-array-reverse/suggestion-not-spreading-array';
const messages = {
	[MESSAGE_ID_ERROR]: 'Use `Array#toReversed()` instead of `Array#reverse()`.',
	[MESSAGE_ID_SUGGESTION_ONLY_FIX_METHOD]: 'Switch to `.toReversed()`.',
	[MESSAGE_ID_SUGGESTION_SPREADING_ARRAY]: 'The spreading object is an array',
	[MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY]: 'The spreading object is NOT an array',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {allowExpressionStatement} = context.options[0];

	return {
		CallExpression(callExpression) {
			if (!isMethodCall(callExpression, {
				method: 'reverse',
				argumentsLength: 0,
				optionalCall: false,
			})) {
				return;
			}

			const array = callExpression.callee.object;

			// `[...array].reverse()`
			const isSpreadAndReverse = array.type === 'ArrayExpression'
				&& array.elements.length === 1
				&& array.elements[0].type === 'SpreadElement';

			if (allowExpressionStatement && !isSpreadAndReverse) {
				const maybeExpressionStatement = callExpression.parent.type === 'ChainExpression'
					? callExpression.parent.parent
					: callExpression.parent;
				if (maybeExpressionStatement.type === 'ExpressionStatement') {
					return;
				}
			}

			const reverseProperty = callExpression.callee.property;
			const suggestions = [];
			const fixMethodName = fixer => fixer.replaceText(reverseProperty, 'toReversed');

			/*
			For `[...array].reverse()`, provide two suggestion, let user choose if the object can be unwrapped,
			otherwise only change `.reverse()` to `.toReversed()`
			*/
			if (isSpreadAndReverse) {
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
				messageId: isSpreadAndReverse
					? MESSAGE_ID_SUGGESTION_NOT_SPREADING_ARRAY
					: MESSAGE_ID_SUGGESTION_ONLY_FIX_METHOD,
				fix: fixMethodName,
			});

			return {
				node: reverseProperty,
				messageId: MESSAGE_ID_ERROR,
				suggest: suggestions,
			};
		},
	};
};

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

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array#toReversed()` over `Array#reverse()`.',
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{allowExpressionStatement: true}],
		messages,
	},
};

export default config;
