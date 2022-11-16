'use strict';
const {getStaticValue} = require('eslint-utils');
const quoteString = require('./utils/quote-string.js');
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

const isRegexLiteralWithGlobalFlag = node =>
	isRegexLiteral(node)
	&& node.regex.flags.replace('u', '') === 'g';

const isRegExpWithGlobalFlag = (node, scope) => {
	if (isRegexLiteral(node)) {
		return node.regex.flags.includes('g');
	}

	if (
		isNewExpression(node, {name: 'RegExp'})
		&& node.arguments[0]?.type !== 'SpreadElement'
		&& node.arguments[1]?.type === 'Literal'
		&& typeof node.arguments[1].value === 'string'
		&& node.arguments[1].value.includes('g')
	) {
		return true;
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

function isLiteralCharactersOnly(node) {
	const searchPattern = node.regex.pattern;
	return !/[$()*+.?[\\\]^{|}]/.test(searchPattern.replace(/\\[$()*+.?[\\\]^{|}]/g, ''));
}

function removeEscapeCharacters(regexString) {
	let fixedString = regexString;
	let index = 0;
	do {
		index = fixedString.indexOf('\\', index);

		if (index >= 0) {
			fixedString = fixedString.slice(0, index) + fixedString.slice(index + 1);
			index++;
		}
	} while (index >= 0);

	return fixedString;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = (context) => ({
	[selector](node) {
		const {
			arguments: [pattern],
			callee: {property}
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

				if (!isRegexLiteralWithGlobalFlag(pattern) || !isLiteralCharactersOnly(pattern)) {
					return;
				}

				const string = removeEscapeCharacters(pattern.regex.pattern);

				yield fixer.replaceText(pattern, quoteString(string))
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
