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
	const {sourceCode} = context;
	const {directives} = sourceCode.getDisableDirectives();
	return directives.some(({node}) => {
		if (node === comment) {
			return true;
		}

		// Some languages synthesize directive nodes separately and include surrounding whitespace in their comment AST nodes.
		const [start, end] = sourceCode.getRange(node);
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return start >= commentStart && end <= commentEnd
			&& sourceCode.text.slice(commentStart, start).trim() === ''
			&& sourceCode.text.slice(end, commentEnd).trim() === '';
	});
}

export {
	getEslintDisableDirectives,
	isEslintDisableOrEnableDirective,
};
