/**
Get all comments in the file, regardless of language. JavaScript/TypeScript expose them via `sourceCode.getAllComments()`, while non-JavaScript languages (for example CSS via `@eslint/css`) expose them on `sourceCode.comments`. Some plugins like `@html-eslint` have `getAllComments()` but it returns `[]` — in that case we fall back to `sourceCode.comments`.

@param {import('eslint').Rule.RuleContext} context
@returns {Array<object>}
*/
export default function getComments(context) {
	const {sourceCode} = context;
	const fromGetAllComments = sourceCode.getAllComments?.();
	if (fromGetAllComments?.length) {
		return fromGetAllComments;
	}

	return sourceCode.comments ?? [];
}
