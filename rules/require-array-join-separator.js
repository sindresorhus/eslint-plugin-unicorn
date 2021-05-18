'use strict';
const {isCommaToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID = 'require-array-join-separator';
const messages = {
	[MESSAGE_ID]: 'Missing the separator argument.'
};

const emptyArraySelector = path => {
	const prefix = `${path}.`;
	return [
		`[${prefix}type="ArrayExpression"]`,
		`[${prefix}elements.length=0]`
	].join('');
};

const memberExpressionSelector = (path, {property, object}) => {
	const prefix = `${path}.`;

	const parts = [
		`[${prefix}type="MemberExpression"]`,
		`[${prefix}computed=false]`,
		`[${prefix}optional!=true]`,
		`[${prefix}property.type="Identifier"]`,
		`[${prefix}property.name="${property}"]`
	];

	if (object) {
		parts.push(
			`[${prefix}object.type="Identifier"]`,
			`[${prefix}object.name="${object}"]`
		);
	}

	return parts.join('');
};

// `foo.join()`
const arrayJoin = methodSelector({
	name: 'join',
	length: 0
});

// `[].join.call(foo)` and `Array.prototype.join.call(foo)`
const arrayPrototypeJoin = [
	methodSelector({
		name: 'call',
		length: 1
	}),
	memberExpressionSelector('callee.object', {property: 'join'}),
	`:matches(${
		[
			emptyArraySelector('callee.object.object'),
			memberExpressionSelector('callee.object.object', {property: 'prototype', object: 'Array'})
		].join(', ')
	})`
].join('');

const selector = `:matches(${arrayJoin}, ${arrayPrototypeJoin})`;

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
