import {hasSideEffect, isCommaToken} from '@eslint-community/eslint-utils';
import {removeArgument, switchNewExpressionToCallExpression} from './fix/index.js';
import isNumber from './utils/is-number.js';
import {isNewExpression} from './ast/index.js';
import {getStaticValueForControlFlow, hasCommentInRange} from './utils/index.js';

const ERROR = 'error';
const ERROR_UNKNOWN = 'error-unknown';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: '`new Buffer()` is deprecated, use `Buffer.{{method}}()` instead.',
	[ERROR_UNKNOWN]: '`new Buffer()` is deprecated, use `Buffer.alloc()` or `Buffer.from()` instead.',
	[SUGGESTION]: 'Switch to `Buffer.{{replacement}}()`.',
};

const inferMethod = (bufferArguments, context) => {
	const [firstArgument, secondArgument] = bufferArguments;

	if (firstArgument === undefined) {
		return 'from';
	}

	if (firstArgument.type === 'SpreadElement') {
		return;
	}

	// A numeric input selects allocation, while `Buffer.from()` would throw on it. Extra arguments can be ignored or rejected, so conversions that drop them require review.
	if (isNumber(firstArgument, context)) {
		return 'alloc';
	}

	if (firstArgument.type === 'ArrayExpression' || firstArgument.type === 'TemplateLiteral') {
		return 'from';
	}

	// `new Buffer(number, string)` throws like `Buffer.from()` does, so a string encoding selects `Buffer.from()` for any input.
	if (secondArgument && typeof getStaticValueForControlFlow(secondArgument, context)?.value === 'string') {
		return 'from';
	}

	const staticResult = getStaticValueForControlFlow(firstArgument, context);
	if (staticResult) {
		const {value} = staticResult;
		if (
			typeof value === 'string'
			|| Array.isArray(value)
		) {
			return 'from';
		}
	}
};

/**
The allocation replacement drops extra arguments. Keep comments and explicit side effects detected by the guard.
*/
function canRemoveIgnoredArguments(node, context) {
	const [sizeArgument, ...ignoredArguments] = node.arguments;
	if (ignoredArguments.length === 0) {
		return true;
	}

	const {sourceCode} = context;
	const [commaStart] = sourceCode.getRange(sourceCode.getTokenAfter(sizeArgument, isCommaToken));
	const [, end] = sourceCode.getRange(node);

	return !hasCommentInRange(context, [commaStart, end])
		&& ignoredArguments.every(argument => !hasSideEffect(argument, sourceCode));
}

function fix(node, context, method) {
	return function * (fixer) {
		// The allocation replacement takes only the size, since passing extra arguments through can add a fill.
		if (method === 'alloc') {
			for (const argument of node.arguments.slice(1).toReversed()) {
				yield removeArgument(fixer, argument, context);
			}
		}

		yield fixer.insertTextAfter(node.callee, `.${method}`);
		yield switchNewExpressionToCallExpression(node, context, fixer);
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', node => {
		if (!isNewExpression(node, {name: 'Buffer'})) {
			return;
		}

		const method = inferMethod(node.arguments, context);

		if (!method) {
			return {
				node,
				messageId: ERROR_UNKNOWN,
				suggest: ['from', 'alloc'].filter(replacement => replacement !== 'alloc' || canRemoveIgnoredArguments(node, context)).map(replacement => ({
					messageId: SUGGESTION,
					data: {replacement},
					fix: fix(node, context, replacement),
				})),
			};
		}

		const problem = {
			node,
			messageId: ERROR,
			data: {method},
		};

		if (method !== 'alloc' || node.arguments.length === 1) {
			return {...problem, fix: fix(node, context, method)};
		}

		if (canRemoveIgnoredArguments(node, context)) {
			problem.suggest = [{messageId: SUGGESTION, data: {replacement: method}, fix: fix(node, context, method)}];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.',
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
