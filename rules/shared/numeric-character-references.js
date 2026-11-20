// Espree reads at most ten characters after the ampersand, including the semicolon.
// That leaves room for `#` and eight decimal digits, or `#x` and seven hexadecimal digits.
const jsxNumericCharacterReferencePattern = /&#(?:x[\dA-Fa-f]{1,7}|\d{1,8});/gv;

function getNumericCharacterReferenceCodePoint(reference) {
	const digits = reference.slice(2, -1);
	return /^x/iv.test(digits) ? Number.parseInt(digits.slice(1), 16) : Number(digits);
}

export {jsxNumericCharacterReferencePattern, getNumericCharacterReferenceCodePoint};
