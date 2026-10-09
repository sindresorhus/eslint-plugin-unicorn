/**
Check whether a string literal raw value contains an escape that is invalid in template literals.

Legacy octal (`\1`, `\012`) and `\8`/`\9` escapes are valid in sloppy-mode string literals but are syntax errors inside template literals.

@param {string} raw
@returns {boolean}
*/
export default function hasTemplateIncompatibleEscape(raw) {
	return /(?<=(?:^|[^\\])(?:\\\\)*)\\(?:[1-9]|0\d)/v.test(raw);
}
