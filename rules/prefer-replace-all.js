'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

function hasGlobalFlag(node) {
	const searchPattern = node.arguments[0];
	return searchPattern && searchPattern.regex && searchPattern.regex.flags === 'g';
}

function isLiteralCharactersOnly(node) {
	const searchPattern = node.arguments[0].regex.pattern;
	return !/[$()*+.?[\\\]^{}]/.test(searchPattern.replace(/\\[$()*+.?[\\\]^{}]/g, ''));
}

function replaceNode(node, fixer) {
	const searchPattern = node.arguments[0].regex.pattern;
	return [fixer.insertTextAfter(node.callee, 'All'),
		fixer.replaceText(node.arguments[0], quoteString(searchPattern))];
}

function checkNode(context, node) {
	if (hasGlobalFlag(node) && isLiteralCharactersOnly(node) && node.arguments.length === 2) {
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
