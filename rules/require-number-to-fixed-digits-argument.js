'use strict';
const {appendArgument} = require('./fix/index.js');
const {isMethodCall} = require('./ast/index.js');

const MESSAGE_ID = 'require-number-to-fixed-digits-argument';
const messages = {
	[MESSAGE_ID]: 'Missing the digits argument.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (
			!isMethodCall(node, {
				method: 'toFixed',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			|| node.callee.object.type === 'NewExpression'
		) {
			return;
		}

		const {sourceCode} = context;
		const [
			openingParenthesis,
			closingParenthesis,
		] = sourceCode.getLastTokens(node, 2);

		return {
			loc: {
				start: openingParenthesis.loc.start,
				end: closingParenthesis.loc.end,
			},
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => appendArgument(fixer, node, '0', sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce using the digits argument with `Number#toFixed()`.',
		},
		fixable: 'code',
		messages,
	},
};
