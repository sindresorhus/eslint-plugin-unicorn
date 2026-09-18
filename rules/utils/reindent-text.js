const linePattern = /(?<linebreak>\r\n|[\n\r\u2028\u2029])(?<line>[^\n\r\u2028\u2029]*)/g;

/**
Move multi-line text from one indentation to another.

The first line is kept as it is, because the text usually starts in the middle of a line. Every later line that starts with `sourceIndent` gets `targetIndent` in its place. A line that does not start with `sourceIndent`, like the inside of a template literal, is kept as it is. A line with only whitespace becomes empty. Line endings are kept.

Pass an empty `sourceIndent` to indent every later line by `targetIndent`.

@param {string} text - The text to reindent.
@param {string} sourceIndent - The indentation the text has now.
@param {string} targetIndent - The indentation the text should have.
@returns {string}
*/
export default function reindentText(text, sourceIndent, targetIndent) {
	return text.replaceAll(linePattern, (_, linebreak, line) => {
		if (line.trim() === '') {
			return linebreak;
		}

		if (line.startsWith(sourceIndent)) {
			return `${linebreak}${targetIndent}${line.slice(sourceIndent.length)}`;
		}

		return `${linebreak}${line}`;
	});
}
