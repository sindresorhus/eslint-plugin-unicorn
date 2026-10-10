const LINE_ENDINGS = ['\n', '\r', '\u2028', '\u2029'];

/**
Get the index of the start of the line containing `index`.

@param {string} text
@param {number} index
@returns {number}
*/
export default function getLineStart(text, index) {
	return Math.max(...LINE_ENDINGS.map(lineEnding => text.lastIndexOf(lineEnding, index - 1))) + 1;
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
