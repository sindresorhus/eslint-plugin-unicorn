'use strict';
const {getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const isNewExpressionWithParentheses = require('./utils/is-new-expression-with-parentheses');

const ERROR = 'error';
const ERROR_UNKNOWN = 'error-unknown';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: '`new Buffer()` is deprecated, use `Buffer.{{method}}()` instead.',
	[ERROR_UNKNOWN]: '`new Buffer()` is deprecated, use `Buffer.alloc()` or `Buffer.from()` instead.',
	[SUGGESTION]: 'Switch to `Buffer.{{method}}()`.'
};

const inferMethod = (bufferArguments, scope) => {
	if (bufferArguments.length !== 1) {
		return 'from';
	}

	const [firstArgument] = bufferArguments;
	if (firstArgument.type === 'SpreadElement') {
		return;
	}

	if (firstArgument.type === 'ArrayExpression') {
		return 'from';
	}

	const staticResult = getStaticValue(firstArgument, scope);
	if (staticResult) {
		const {value} = staticResult;
		if (typeof value === 'number') {
			return 'alloc';
		}

		if (
			typeof value === 'string' ||
			Array.isArray(value)
		) {
			return 'from';
		}
	}
};

function fix(node, sourceCode, method) {
	return function * (fixer) {
		const [start] = node.range;
		let end = start + 3; // `3` = length of `new`
		const textAfter = sourceCode.text.slice(end);
		const [leadingSpaces] = textAfter.match(/^\s*/);
		end += leadingSpaces.length;
		yield fixer.removeRange([start, end]);

		yield fixer.insertTextAfter(node.callee, `.${method}`);

		if (!isNewExpressionWithParentheses(node, sourceCode)) {
			yield fixer.insertTextAfter(node, '()');
		}
	};
}

const create = context => {
	const sourceCode = context.getSourceCode();
	return {
		'NewExpression[callee.name="Buffer"]': node => {
			const method = inferMethod(node.arguments, context.getScope());

			if (method) {
				context.report({
					node,
					messageId: ERROR,
					data: {method},
					fix: fix(node, sourceCode, method)
				});
			} else {
				context.report({
					node,
					messageId: ERROR_UNKNOWN,
					suggest: [
						'from',
						'alloc'
					].map(method => ({
						messageId: SUGGESTION,
						data: {method},
						fix: fix(node, sourceCode, method)
					}))
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
