'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID = 'prefer-replace-all';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#replaceAll()` over `String#replace()`.'
};

const selector = methodSelector({
	name: 'replace',
	length: 2
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

const create = context => {
	return {
		[selector]: node => {
			const {arguments: arguments_} = node;
			const [search] = arguments_;

			if (!isRegexWithGlobalFlag(search) || !isLiteralCharactersOnly(search)) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer =>
					[
						fixer.insertTextAfter(node.callee, 'All'),
						fixer.replaceText(search, quoteString(removeEscapeCharacters(search.regex.pattern)))
					]
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
