/**
Check if the character at `index` in raw source text is escaped, that is, preceded by an odd number of backslashes.

@param {string} text
@param {number} index
@returns {boolean}
*/
export default function isEscapedCharacter(text, index) {
	let backslashCount = 0;

	for (let previousIndex = index - 1; previousIndex >= 0 && text[previousIndex] === '\\'; previousIndex--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}
