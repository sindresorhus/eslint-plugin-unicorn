import {appendArgument, replaceArgument} from './fix/index.js';
import {isMethodCall, isUndefined} from './ast/index.js';
import {isKnownNonArray} from './utils/index.js';

const MESSAGE_ID = 'require-array-sort-compare';
const SUGGESTION_ID_NUMERIC = 'require-array-sort-compare/numeric';
const SUGGESTION_ID_STRING = 'require-array-sort-compare/string';
const messages = {
	[MESSAGE_ID]: 'Pass a compare function to avoid sorting elements as strings.',
	[SUGGESTION_ID_NUMERIC]: 'Sort numerically.',
	[SUGGESTION_ID_STRING]: 'Sort strings with `String#localeCompare()`.',
};

const numericCompareFunction = '(a, b) => a - b';
const stringCompareFunction = '(a, b) => a.localeCompare(b)';

const getCompareFunctionFix = (callExpression, compareFunction, context) => fixer => {
	const [firstArgument] = callExpression.arguments;
	return firstArgument
		? replaceArgument(fixer, firstArgument, compareFunction, context)
		: appendArgument(fixer, callExpression, compareFunction, context);
};

const getSuggestions = (callExpression, context) => {
	if (context.sourceCode.getCommentsInside(callExpression).length > 0) {
		return;
	}

	return [
		{
			messageId: SUGGESTION_ID_NUMERIC,
			fix: getCompareFunctionFix(callExpression, numericCompareFunction, context),
		},
		{
			messageId: SUGGESTION_ID_STRING,
			fix: getCompareFunctionFix(callExpression, stringCompareFunction, context),
		},
	];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['sort', 'toSorted'],
			maximumArguments: 1,
			optionalCall: false,
		})) {
			return;
		}

		if (
			callExpression.arguments.length === 1
			&& !isUndefined(callExpression.arguments[0])
		) {
			return;
		}

		if (isKnownNonArray(callExpression.callee.object, context)) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			suggest: getSuggestions(callExpression, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require a compare function when calling `Array#sort()` or `Array#toSorted()`.',
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
