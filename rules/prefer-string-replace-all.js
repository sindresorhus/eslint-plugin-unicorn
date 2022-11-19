'use strict';
const {getStaticValue} = require('eslint-utils');
const {parse: parseRegExp} = require('regjsparser');
const escapeString = require('./utils/escape-string.js');
const {methodCallSelector} = require('./selectors/index.js');
const {isRegexLiteral, isNewExpression} = require('./ast/index.js');

const MESSAGE_ID = 'prefer-string-replace-all';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#replaceAll()` over `String#replace()`.',
};

const selector = methodCallSelector({
	method: 'replace',
	argumentsLength: 2,
});

function * convertRegExpToString(node, fixer) {
	if (!isRegexLiteral(node)) {
		return;
	}

	const {pattern, flags} = node.regex;
	if (flags.replace('u', '') !== 'g') {
		return;
	}

	const tree = parseRegExp(pattern, flags, {
		unicodePropertyEscape: true,
		namedGroups: true,
		lookbehind: true,
	});

	const parts = tree.type === 'alternative' ? tree.body : [tree];
	if (parts.some(part => part.type !== 'value')) {
		return;
	}

	// TODO: persevere escape
	const string = String.fromCodePoint(...parts.map(part => part.codePoint));

	yield fixer.replaceText(node, escapeString(string));
}

const isRegExpWithGlobalFlag = (node, scope) => {
	if (isRegexLiteral(node)) {
		return node.regex.flags.includes('g');
	}

	if (
		isNewExpression(node, {name: 'RegExp'})
		&& node.arguments[0]?.type !== 'SpreadElement'
		&& node.arguments[1]?.type === 'Literal'
		&& typeof node.arguments[1].value === 'string'
	) {
		return node.arguments[1].value.includes('g');
	}

	const staticResult = getStaticValue(node, scope);

	// Don't know if there is `g` flag
	if (!staticResult) {
		return false;
	}

	const {value} = staticResult;
	return (
		Object.prototype.toString.call(value) === '[object RegExp]'
		&& value.global
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[selector](node) {
		const {
			arguments: [pattern],
			callee: {property},
		} = node;

		if (!isRegExpWithGlobalFlag(pattern, context.getScope())) {
			return;
		}

		return {
			node: property,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixer.insertTextAfter(property, 'All');
				yield * convertRegExpToString(pattern, fixer);
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#replaceAll()` over regex searches with the global flag.',
		},
		fixable: 'code',
		messages,
	},
};
