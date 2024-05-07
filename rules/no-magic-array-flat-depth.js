'use strict';
const {isOpeningParenToken} = require('@eslint-community/eslint-utils');
const {isMethodCall, isNumberLiteral} = require('./ast/index.js');

const MESSAGE_ID = 'no-magic-array-flat-depth';
const messages = {
	[MESSAGE_ID]: 'Magic number as depth is not allowed.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!isMethodCall(callExpression, {
			method: 'flat',
			argumentsLength: 1,
			optionalCall: false,
		})) {
			return;
		}

		const [depth] = callExpression.arguments;

		if (
			!isNumberLiteral(depth)
				|| depth.value === 1
		) {
			return;
		}

		const {sourceCode} = context;
		const openingParenthesisToken = sourceCode.getTokenAfter(callExpression.callee, isOpeningParenToken);
		const closingParenthesisToken = sourceCode.getLastToken(callExpression);
		if (sourceCode.commentsExistBetween(openingParenthesisToken, closingParenthesisToken)) {
			return;
		}

		return {
			node: depth,
			messageId: MESSAGE_ID,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow magic number as the `depth` argument in `Array#flat(…).`',
		},
		messages,
	},
};
