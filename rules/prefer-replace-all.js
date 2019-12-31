'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

function hasGlobalFlag(node) {
	const searchPattern = node.arguments[0];
	return searchPattern && searchPattern.regex && searchPattern.regex.flags === 'g';
}

function isLiteralCharactersOnly(node) {
	const searchPattern = node.arguments[0].regex.pattern;
	const specialCharacters = searchPattern.match(/[$()*+.?[\\\]^{}]/g);
	const specialCharactersCount = specialCharacters ? specialCharacters.length : 0;
	const escapedSpecialCharacters = searchPattern.match(/\\[$()*+.?[\\\]^{}]/g);
	const escapedSpecialCharactersCount = escapedSpecialCharacters ? escapedSpecialCharacters.length : 0;
	return specialCharactersCount === 2 * escapedSpecialCharactersCount;
}

function replaceNode(node, fixer) {
	const stringName = node.callee.object.name;
	const searchPattern = node.arguments[0].regex.pattern;
	const replacePattern = node.arguments[1].value;
	return fixer.replaceText(node, `${stringName}.replaceAll(${quoteString(searchPattern)}, ${quoteString(replacePattern)})`);
}

function checkNode(context, node) {
	if (hasGlobalFlag(node) && isLiteralCharactersOnly(node)) {
		context.report({
			node,
			message: 'Use replaceAll method of string.',
			fix: fixer => replaceNode(node, fixer)
		});
	}
}

const create = context => {
	return {
		'CallExpression[callee.property.name="replace"]': node => {
			checkNode(context, node);
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
