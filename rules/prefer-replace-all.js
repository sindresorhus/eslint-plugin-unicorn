'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

function isRegexWithGlobalFlag(node) {
	const {type, regex} = node;

	return type === 'Literal' && regex && regex.flags === 'g';
}

function isLiteralCharactersOnly(node) {
	const searchPattern = node.arguments[0].regex.pattern;
	return !/[$()*+.?[\\\]^{}]/.test(searchPattern.replace(/\\[$()*+.?[\\\]^{}]/g, ''));
}

const create = context => {
	return {
		'CallExpression[callee.property.name="replace"]': node => {
			const {arguments: arguments_} = node;

			if (arguments_.length !== 2) {
				return;
			}

			const [search] = arguments_;

			if (!isRegexWithGlobalFlag(search) || !isLiteralCharactersOnly(search)) {
				return;
			}

			context.report({
				node,
				message: 'Prefer `String#replaceAll()` over `String#replace()`.',
				fix: fixer => [
					fixer.insertTextAfter(node.callee, 'All'),
					fixer.replaceText(search, quoteString(search.regex.pattern))
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
		fixable: 'code'
	}
};
