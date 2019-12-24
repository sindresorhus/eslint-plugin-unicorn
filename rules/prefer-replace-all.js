'use strict';
/* eslint no-useless-escape: 0 */
const getDocumentationUrl = require('./utils/get-documentation-url');

function checkReplace(node) {
	return node.callee.property.name === 'replace';
}

function checkGlobalFlag(node) {
	const searchPattern = node.arguments[0];
	return Object.prototype.hasOwnProperty.call(searchPattern, 'regex') && searchPattern.regex.flags === 'g';
}

function checkLiteralCharactersOnly(node) {
	const searchPattern = node.arguments[0].regex.pattern;
	const specialCharacters = searchPattern.match(/[\^\$\*\+\?\.\(\)\{\}\[\]\\]/g);
	const specialCharactersCount = specialCharacters ? specialCharacters.length : 0;
	const escapedSpecialCharacters = searchPattern.match(/\\[\^\$\*\+\?\.\(\)\{\}\[\]\\]/g);
	const escapedSpecialCharactersCount = escapedSpecialCharacters ? escapedSpecialCharacters.length : 0;
	return specialCharactersCount === 2 * escapedSpecialCharactersCount;
}

function replaceNode(node, fixer) {
	const stringName = node.callee.object.name;
	const searchPattern = node.arguments[0].regex.pattern.replace(/\\(.)/g, '$1');
	const replacePattern = node.arguments[1].value;
	return fixer.replaceText(node, stringName + '.replaceAll("' + searchPattern + '", "' + replacePattern + '")');
}

function checkNode(context, node) {
	if (checkReplace(node) && checkGlobalFlag(node) && checkLiteralCharactersOnly(node)) {
		context.report({
			node,
			message: 'Use replaceAll method of string.',
			fix: fixer => replaceNode(node, fixer)
		});
	}
}

const create = context => {
	return {
		CallExpression: node => {
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
