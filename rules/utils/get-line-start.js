const LINE_ENDINGS = new Set(['\n', '\r', '\u2028', '\u2029']);

/**
Get the index of the start of the line containing `index`.

@param {string} text
@param {number} index
@returns {number}
*/
export default function getLineStart(text, index) {
	// Scan back to the previous line ending instead of searching for each kind, since a search for a rare one like `\u2028` scans to the start of the text on every call.
	let lineStart = index;
	while (lineStart > 0 && !LINE_ENDINGS.has(text[lineStart - 1])) {
		lineStart--;
	}

	return lineStart;
}

/**
Get the text between the start of the line containing `start` and `start`.

@param {import('eslint').Rule.RuleContext} context
@param {number} start
@returns {string}
*/
export function getLinePrefix(context, start) {
	const {sourceCode} = context;
	return sourceCode.text.slice(getLineStart(sourceCode.text, start), start);
}
