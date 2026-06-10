/**
Whether the filename is one of ESLint's placeholders for code linted without a real file on disk (`<input>` for stdin, `<text>` for `Linter#verify` with no filename).

@param {string} filename
@returns {boolean}
*/
export default function isVirtualFilename(filename) {
	return filename === '<input>' || filename === '<text>';
}
