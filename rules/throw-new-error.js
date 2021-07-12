'use strict';
const {matches} = require('./selectors/index.js');
const {getParenthesizedRange, isParenthesized} = require('./utils/parentheses.js');
const shouldAddParenthesesToNewExpressionCallee = require('./utils/should-add-parentheses-to-new-expression-callee.js');

const messageId = 'throw-new-error';
const messages = {
	[messageId]: 'Use `new` when throwing an error.',
};

const customError = /^(?:[A-Z][\da-z]*)*Error$/;

const selector = [
	'ThrowStatement',
	' > ',
	'CallExpression.argument',
	matches([
		// `throw FooError()`
		[
			'[callee.type="Identifier"]',
			`[callee.name=/${customError.source}/]`,
		].join(''),
		// `throw lib.FooError()`
		[
			'[callee.type="MemberExpression"]',
			'[callee.computed=false]',
			'[callee.property.type="Identifier"]',
			`[callee.property.name=/${customError.source}/]`,
		].join(''),
	]),
].join('');

const create = context => ({
	[selector]: node => {
		return {
			node,
			messageId,
			* fix(fixer) {
				const errorConstructor = node.callee;
				const sourceCode = context.getSourceCode();
				const range = getParenthesizedRange(errorConstructor, sourceCode);
				yield fixer.insertTextBeforeRange(range, 'new ');

				if (
					!isParenthesized(errorConstructor, sourceCode) &&
					shouldAddParenthesesToNewExpressionCallee(errorConstructor)
				) {
					yield fixer.insertTextBeforeRange(range, '(');
					yield fixer.insertTextAfterRange(range, ')');
				}
			},
		};
	},
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `new` when throwing an error.',
		},
		fixable: 'code',
		messages,
	},
};
