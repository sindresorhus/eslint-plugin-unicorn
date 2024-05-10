'use strict';
const {isOpeningBraceToken} = require('@eslint-community/eslint-utils');

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.',
};

const getProblem = (node, context) => {
	const {sourceCode} = context;
	const filter = node.type === 'RecordExpression'
		? token => token.type === 'Punctuator' && (token.value === '#{' || token.value === '{|')
		: isOpeningBraceToken;
	const openingBrace = sourceCode.getFirstToken(node, {filter});
	const closingBrace = sourceCode.getLastToken(node);
	const [, start] = openingBrace.range;
	const [end] = closingBrace.range;
	const textBetween = sourceCode.text.slice(start, end);

	if (!/^\s+$/.test(textBetween)) {
		return;
	}

	return {
		loc: {
			start: openingBrace.loc.end,
			end: closingBrace.loc.start,
		},
		messageId: MESSAGE_ID,
		fix: fixer => fixer.removeRange([start, end]),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on([
		'BlockStatement',
		'ClassBody',
		'StaticBlock',
	], node => {
		if (node.body.length > 0) {
			return;
		}

		return getProblem(node, context);
	});

	context.on([
		'ObjectExpression',
		// Experimental https://github.com/tc39/proposal-record-tuple
		'RecordExpression',
	], node => {
		if (node.properties.length > 0) {
			return;
		}

		return getProblem(node, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce no spaces between braces.',
			recommended: true,
		},
		fixable: 'whitespace',
		messages,
	},
};
