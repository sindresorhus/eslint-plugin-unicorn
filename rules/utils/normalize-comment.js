/**
Normalize a comment node to the JavaScript shape, with a `type` of `Line` or `Block` and a string `value`.

Some languages expose comments in a different shape: JSON via `@eslint/json` uses `LineComment`/`BlockComment` tokens without a `value`, and CSS via `@eslint/css` uses `Comment` nodes. This reconstructs `type` and `value` from the raw source text. Comments that already have a `Line` or `Block` type are returned unchanged.

@param {object} comment
@param {import('eslint').Rule.RuleContext} context
@returns {object}
*/
export default function normalizeComment(comment, context) {
	if (comment.type === 'Line' || comment.type === 'Block') {
		return comment;
	}

	const {sourceCode} = context;
	const range = sourceCode.getRange(comment);
	const text = sourceCode.text.slice(...range);

	if (text.startsWith('//')) {
		return {
			...comment,
			type: 'Line',
			value: text.slice(2),
			range,
		};
	}

	if (text.startsWith('/*')) {
		return {
			...comment,
			type: 'Block',
			value: text.slice(2, -2),
			range,
		};
	}

	return comment;
}
