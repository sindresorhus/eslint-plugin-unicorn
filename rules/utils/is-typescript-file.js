/**
Whether the filename has a TypeScript extension (`.ts`, `.mts`, `.cts`, `.tsx`).

@param {string} filename
@returns {boolean}
*/
export default function isTypeScriptFile(filename) {
	return /\.(?:ts|mts|cts|tsx)$/i.test(filename);
}
