'use strict';
const {matches} = require('./selectors/index.js');

const MESSAGE_ID_UNNECESSARY_INTERPOLATION = 'MESSAGE_ID_UNNECESSARY_INTERPOLATION';
const MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST = 'MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST';
const MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING = 'MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING';
const MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST = 'MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST';
const MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION = 'MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION';

const messages = {
	[MESSAGE_ID_UNNECESSARY_INTERPOLATION]: 'Unnecessary interpolation of "{{value}}" in template string.',
	[MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST]: 'Remove redundant interpolation.',
	[MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING]: 'Unnecessary convert to string in template string.',
	[MESSAGE_ID_UNNECESSARY_CONVERT_TO_STRING_SUGGEST]: 'Remove redundant "{{functionName}}()".',
	[MESSAGE_ID_UNEXPECTED_STRING_CONCATENATION]: 'Unexpected string concatenation in template string.',
};

const unnecessaryInterpolationSelector = [
	'TemplateLiteral[expressions.length>0]',
	matches([
		'Literal[parent.type!=/^(BinaryExpression|UnaryExpression)$/]',
		'Identifier[name=undefined]',
		'TemplateLiteral[expressions.length=0] TemplateElement',
	]),
].join(' ');

const unnecessaryConvertToStringSelector = [
	'TemplateLiteral',
	matches(['CallExpression[callee.property.name=toString] .property', 'CallExpression[callee.name=String] .callee']),
].join(' ');

const unexpectedStringConcatenationSelector = [
	'TemplateLiteral',
	'BinaryExpression',
	'Literal',
].join(' ');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[unnecessaryInterpolationSelector](node) {
		const value = node.type === 'TemplateElement' ? node.value.raw : node.value;
		context.report({
			node,
			messageId: MESSAGE_ID_UNNECESSARY_INTERPOLATION,
			data: {value},
			suggest: [
				{
					messageId: MESSAGE_ID_UNNECESSARY_INTERPOLATION_SUGGEST,
					fix(fixer) {
						const codeSource = context.getSourceCode();
						const tokenBefore = codeSource.getTokenBefore(node);
						const tokenAfter = codeSource.getTokenAfter(node);
						return fixer.replaceTextRange([tokenBefore.end - 2, tokenAfter.start + 1], value);
					},
				},
			],
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
					fix(fixer) {
						if (!isToStringFn) {
							return fixer.removeRange(node.range);
						}

						const codeSource = context.getSourceCode();
						const tokenBefore = codeSource.getTokenBefore(node);
						const tokenAfter = codeSource.getTokensAfter(node).find(token => token.value === ')');
						return fixer.removeRange([tokenBefore.end - 1, tokenAfter.start + 1]);
					},
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
