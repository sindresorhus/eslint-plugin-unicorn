'use strict';
const {getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const switchNewExpressionToCallExpression = require('./utils/switch-new-expression-to-call-expression');

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

	if (firstArgument.type === 'ArrayExpression' || firstArgument.type === 'TemplateLiteral') {
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
		yield fixer.insertTextAfter(node.callee, `.${method}`);
		yield * switchNewExpressionToCallExpression(node, sourceCode, fixer);
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
			description: 'Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
