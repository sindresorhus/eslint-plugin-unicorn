/**
Get all comments in the file, regardless of language. JavaScript/TypeScript expose them via `sourceCode.getAllComments()`, while non-JavaScript languages (for example CSS via `@eslint/css`) expose them on `sourceCode.comments`.

@param {import('eslint').Rule.RuleContext} context
@returns {Array<object>}
*/
export default function getComments(context) {
	const {sourceCode} = context;
	return sourceCode.getAllComments?.() ?? sourceCode.comments ?? [];
}
