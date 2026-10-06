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

/**
Get the HTML comments (`<!-- … -->`) in a Markdown file (`@eslint/markdown`), which does not expose comments. Only the HTML nodes of the Markdown AST are searched, so text that looks like a comment inside inline code or a code block is ignored.

Each comment is a `Block` comment with the `value` between `<!--` and `-->`, plus `range` and `loc`. An unclosed comment runs to the end of its HTML node. For other languages, it returns an empty array.

@param {import('eslint').Rule.RuleContext} context
@returns {Array<{type: 'Block', value: string, range: [number, number], loc: import('eslint').AST.SourceLocation}>}
*/
export function getMarkdownHtmlComments(context) {
	const {sourceCode} = context;
	const comments = [];

	const collectComments = node => {
		if (node.type === 'html' && typeof node.position?.start?.offset === 'number') {
			const nodeStart = node.position.start.offset;
			const {value} = node;

			for (let index = value.indexOf('<!--'); index !== -1; index = value.indexOf('<!--', index)) {
				const end = value.indexOf('-->', index + 4);
				const valueEnd = end === -1 ? value.length : end;
				const range = [
					nodeStart + index,
					nodeStart + (end === -1 ? value.length : end + 3),
				];

				comments.push({
					type: 'Block',
					value: value.slice(index + 4, valueEnd),
					range,
					loc: {
						start: sourceCode.getLocFromIndex(range[0]),
						end: sourceCode.getLocFromIndex(range[1]),
					},
				});

				index = range[1] - nodeStart;
			}
		}

		for (const child of node.children ?? []) {
			collectComments(child);
		}
	};

	if (sourceCode.ast?.type === 'root') {
		collectComments(sourceCode.ast);
	}

	return comments;
}
