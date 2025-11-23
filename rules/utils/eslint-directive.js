// https://github.com/eslint/eslint/blob/df5566f826d9f5740546e473aa6876b1f7d2f12c/lib/languages/js/source-code/source-code.js#L914-L917
const ESLINT_DISABLE_DIRECTIVE_TYPES = new Set([
	'disable',
	'disable-next-line',
	'disable-line',
]);

function getEslintDisableDirectives(context) {
	const {directives} = context.sourceCode.getDisableDirectives();
	return directives.filter(({type}) => ESLINT_DISABLE_DIRECTIVE_TYPES.has(type));
}

function isEslintDisableOrEnableDirective(context, comment) {
	const {directives} = context.sourceCode.getDisableDirectives();
	return directives.some(directive => directive.node === comment);
}

export {
	getEslintDisableDirectives,
	isEslintDisableOrEnableDirective,
};
