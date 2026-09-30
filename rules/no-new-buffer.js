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
	const [firstArgument] = bufferArguments;

	if (firstArgument === undefined) {
		return 'from';
	}

	if (firstArgument.type === 'SpreadElement') {
		return;
	}

	// `new Buffer(size)` is the only form that takes a leading number, `Buffer.from()` would throw on it. The legacy constructor dispatches on the first argument alone and silently ignores the rest, so any extra argument has to be dropped to keep `Buffer.alloc(size)` equivalent.
	if (isNumber(firstArgument, context)) {
		return 'alloc';
	}

	if (bufferArguments.length !== 1) {
		return 'from';
	}

	if (firstArgument.type === 'ArrayExpression' || firstArgument.type === 'TemplateLiteral') {
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
`new Buffer(size, fill)` ignores `fill`, so the fix drops it. Dropping it must not drop a side effect, or move a comment that documents it onto the size.
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
		// `new Buffer(size, fill)` ignores `fill`, `Buffer.alloc(size, fill)` would honour it
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
				suggest: ['from', 'alloc'].map(replacement => ({
					messageId: SUGGESTION,
					data: {replacement},
					fix: fix(node, context, replacement),
				})),
			};
		}

		return {
			node,
			messageId: ERROR,
			data: {method},
			...((method !== 'alloc' || canRemoveIgnoredArguments(node, context)) && {fix: fix(node, context, method)}),
		};
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
