// When parsing with `vue-eslint-parser`, we need to use `getTemplateBodyTokenStore()` to get a token inside a `<template>`, and `sourceCode` to get a token inside a `<script>`.
// https://github.com/sindresorhus/eslint-plugin-unicorn/pull/2704/files#r2209196626

/**
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} node
@returns {import('eslint').SourceCode}
*/
function getTokenStore(context, node) {
	const {sourceCode} = context;

	if (
		sourceCode.parserServices.getTemplateBodyTokenStore
		&& sourceCode.ast.templateBody
		&& sourceCode.getRange(sourceCode.ast.templateBody)[0] <= sourceCode.getRange(node)[0]
		&& sourceCode.getRange(node)[1] <= sourceCode.getRange(sourceCode.ast.templateBody)[1]
	) {
		return sourceCode.parserServices.getTemplateBodyTokenStore();
	}

	return sourceCode;
}

export default getTokenStore;
