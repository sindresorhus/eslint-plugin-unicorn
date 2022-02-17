'use strict';
const quoteString = require('./utils/quote-string.js');
const {methodCallSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-string-replace-all';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#replaceAll()` over `String#replace()`.',
};

const selector = methodCallSelector({
	method: 'replace',
	argumentsLength: 2,
});

function isRegexWithGlobalFlag(node) {
	const {type, regex} = node;
	if (type !== 'Literal' || !regex) {
		return false;
	}

	const {flags} = regex;
	return flags.replace('u', '') === 'g';
}

function isLiteralCharactersOnly(node) {
	const searchPattern = node.regex.pattern;
	return !/[$()*+.?[\\\]^{}]/.test(searchPattern.replace(/\\[$()*+.?[\\\]^{}]/g, ''));
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
const create = () => ({
	[selector](node) {
		const {arguments: arguments_, callee} = node;
		const [search] = arguments_;

		if (!isRegexWithGlobalFlag(search) || !isLiteralCharactersOnly(search)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			fix: fixer => [
				fixer.insertTextAfter(callee, 'All'),
				fixer.replaceText(search, quoteString(removeEscapeCharacters(search.regex.pattern))),
			],
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
