'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const regexp = /^(@.*?\/.*?|[./]+?.*?)(?:\/(\.|(?:index(?:\.js)?))?)$/;
const isImportingIndex = value => regexp.test(value);
const normalize = value => value.replace(regexp, '$1');

const importIndex = (context, node, argument) => {
	if (argument && isImportingIndex(argument.value)) {
		context.report({
			node,
			message: 'Do not reference the index file directly.',
			fix: fixer => fixer.replaceText(argument, `'${normalize(argument.value)}'`)
		});
	}
};

const create = context => {
	return {
		'CallExpression[callee.name="require"]': node => importIndex(context, node, node.arguments[0]),
		ImportDeclaration: node => importIndex(context, node, node.source)
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
