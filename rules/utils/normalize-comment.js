/**
Normalize a comment node to the JavaScript shape, with a `type` of `Line` or `Block` and a string `value`.

Some languages (for example JSON via `@eslint/json`) expose comments as tokens without a `value`. This reconstructs `type` and `value` from the raw source text. Comments that are already normalized (those with a string `value`) are returned unchanged.

@param {object} comment
@param {import('eslint').Rule.RuleContext} context
@returns {object}
*/
export default function normalizeComment(comment, context) {
	if (typeof comment.value === 'string') {
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
