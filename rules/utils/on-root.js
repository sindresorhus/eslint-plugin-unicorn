/*
The root node type produced by each ESLint language:

- `Program` — JavaScript/TypeScript, and HTML via `@html-eslint`
- `StyleSheet` — CSS via `@eslint/css`
- `Document` — JSON via `@eslint/json`
- `root` — Markdown via `@eslint/markdown`
*/
const rootNodeTypes = [
	'Program',
	'StyleSheet',
	'Document',
	'root',
];

/**
Register a listener for the root node of every supported language, so the rule runs regardless of the linted file's language.

@param {import('eslint').Rule.RuleContext} context
@param {Function} listener
*/
export default function onRoot(context, listener) {
	context.on(rootNodeTypes, node => {
		// HTML has a `Program` root with a nested `Document`; only run for the physical file root.
		if (node.type === 'Document' && node.parent?.type === 'Program') {
			return;
		}

		return listener(node);
	});
}
