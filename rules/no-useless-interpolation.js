'use strict';
const {matches} = require('./selectors/index.js');

const MESSAGE_ID_UNNECESSARY_INTERPOLATION = 'MESSAGE_ID_UNNECESSARY_INTERPOLATION';
const MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION = 'MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION';
const MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING = 'MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING';
const MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST = 'MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST';
const MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST = 'MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST';

const messages = {
	[MESSAGE_ID_UNNECESSARY_INTERPOLATION]: 'Unnecessary interpolation of "{{value}}" in template string.',
	[MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION]: 'Unexpected string concatenation in template string.',
	[MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING]: 'Unnecessary convert to string in template string.',
	[MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST]: 'Remove redundant interpolation.',
	[MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST]: 'Remove redundant "{{functionName}}()".',
};

const unnecessaryInterpolationSelector = [
	'TemplateLiteral',
	matches(['Literal[parent.type!=/^(BinaryExpression|UnaryExpression)$/]', 'Identifier[name=undefined]']),
].join(' ');

const unexpectedStringConcatenationSelector = [
	'TemplateLiteral',
	'BinaryExpression',
	'Literal',
].join(' ');

const unnecessaryConvertToStringSelector = [
	'TemplateLiteral',
	matches(['CallExpression[callee.property.name=toString] .property', 'CallExpression[callee.name=String] .callee']),
].join(' ');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[unnecessaryInterpolationSelector](node) {
		context.report({
			node,
			messageId: MESSAGE_ID_UNNECESSARY_INTERPOLATION,
			data: {value: node.value},
			suggest: [
				{
					messageId: MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST,
					fix: fixer => fixer.replaceTextRange([node.range[0] - 2, node.range[1] + 1], node.value),
				},
			],
		});
	},
	[unexpectedStringConcatenationSelector](node) {
		context.report({
			node,
			messageId: MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION,
		});
	},
	[unnecessaryConvertToStringSelector](node) {
		const isToStringFn = node.name === 'toString';

		context.report({
			node,
			messageId: MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING,
			suggest: [
				{
					messageId: MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST,
					data: {
						functionName: `${isToStringFn ? '.' : ''}${node.name}`,
					},
					fix: fixer => fixer.removeRange(isToStringFn
						? [node.range[0] - 1, node.range[1] + 2]
						: node.range),
				},
			],
		});
	},
});

const schema = [];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary interpolations in template strings.',
		},
		hasSuggestions: true,
		schema,
		messages,
	},
};
