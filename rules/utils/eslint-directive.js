function isEslintDisableOrEnableDirective(context, comment) {
	const {directives} = context.sourceCode.getDisableDirectives();
	return directives.some(directive => directive.node === comment);
}

export {
	isEslintDisableOrEnableDirective,
};
