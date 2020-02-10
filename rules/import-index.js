'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const regexp = /^(@.*?\/.*?|[./]+?.*?)\/(\.|(?:index(?:\.js)?))?$/;
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
	const options = context.options[0] || {};

	const rules = {
		'CallExpression[callee.name="require"]': node => importIndex(context, node, node.arguments[0])
	};

	if (!options.ignoreImports) {
		rules.ImportDeclaration = node => importIndex(context, node, node.source);
	}

	return rules;
};

const schema = [
	{
		type: 'object',
		properties: {
			ignoreImports: {
				type: 'boolean',
				default: false
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		schema,
		fixable: 'code'
	}
};
