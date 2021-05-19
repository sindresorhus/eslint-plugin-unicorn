'use strict';
const {isCommaToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const {matches, methodCallSelector, arrayPrototypeMethodSelector} = require('./selectors');

const MESSAGE_ID = 'require-array-join-separator';
const messages = {
	[MESSAGE_ID]: 'Missing the separator argument.'
};

const selector = matches([
	// `foo.join()`
	methodCallSelector({name: 'join', length: 0}),
	// `[].join.call(foo)` and `Array.prototype.join.call(foo)`
	[
		methodCallSelector({name: 'call', length: 1}),
		arrayPrototypeMethodSelector({path: 'callee.object', name: 'join'})
	].join('')
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			const [penultimateToken, lastToken] = context.getSourceCode().getLastTokens(node, 2);
			const isPrototypeMethod = node.arguments.length === 1;
			context.report({
				loc: {
					start: penultimateToken.loc[isPrototypeMethod ? 'end' : 'start'],
					end: lastToken.loc.end
				},
				messageId: MESSAGE_ID,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix(fixer) {
					let text = '\',\'';

					if (isPrototypeMethod) {
						text = isCommaToken(penultimateToken) ? `${text},` : `, ${text}`;
					}

					return fixer.insertTextBefore(lastToken, text);
				}
			});
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce using the separator argument with `Array#join()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
