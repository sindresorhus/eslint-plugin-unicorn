/**
@import * as ESLint from 'eslint';
*/

const WORD_CHARACTER = /[\w$]/u;
const DECIMAL_INTEGER_LITERAL = /^\d(?:_?\d)*$/u;
const TRAILING_DECIMAL_INTEGER_LITERAL = /(?:^|[^\w$])\d(?:_?\d)*$/u;
const TRAILING_DIGIT_DOT = /\d\.$/u;

/**
@param {ESLint.AST.Token | string} value
@returns {string}
*/
function getText(value) {
	return typeof value === 'string' ? value : value.value;
}

/**
@param {ESLint.AST.Token | string} value
@returns {boolean}
*/
function isLineCommentOrShebang(value) {
	return typeof value === 'object' && ['Line', 'Shebang', 'Hashbang'].includes(value.type);
}

/**
@param {ESLint.AST.Token | string} value
@returns {boolean}
*/
function isComment(value) {
	return typeof value === 'object' && ['Line', 'Block'].includes(value.type);
}

/**
@param {ESLint.AST.Token | string} value
@returns {boolean}
*/
function isUnsafeNumericDotLeft(value) {
	return typeof value === 'object' ? value.type === 'Numeric' && DECIMAL_INTEGER_LITERAL.test(value.value) : TRAILING_DECIMAL_INTEGER_LITERAL.test(value);
}

/**
Checks whether `left` and `right` can be placed directly next to each other without the last character of `left` and the first character of `right` merging into a token that changes the meaning of the code (for example two identifiers becoming one, `+` and `+` becoming `++`, or `2` and `.2` becoming `2.2`).

This is a lightweight, character-boundary check, not a full tokenizer, inspired by ESLint's own (more thorough) `canTokensBeAdjacent`: https://github.com/eslint/eslint/blob/b23015955c8d6e6516076190730f538c86927f26/lib/rules/utils/ast-utils.js#L2522-L2529
It only guards against the adjacency hazards that come up when building fixer replacement text in this codebase: identifiers/keywords/numbers merging, `+`/`-` doubling into `++`/`--`, a numeric literal absorbing a following decimal point, and a `/` being swallowed into a following comment. It intentionally doesn't try to detect hazards that require a real tokenizer, like an already-open `//` comment inside `left`, or malformed token text.

@param {ESLint.AST.Token | string} left - The left token or text.
@param {ESLint.AST.Token | string} right - The right token or text.
@returns {boolean} `false` if a space is needed between `left` and `right` to keep them from merging. `true` if they can safely be adjacent.
*/
export default function canTokensBeAdjacent(left, right) {
	if (isLineCommentOrShebang(left)) {
		return false;
	}

	const leftText = getText(left);
	const rightText = getText(right);

	if (leftText === '') {
		return true;
	}

	const lastCharacter = leftText.at(-1);

	if (lastCharacter === '/' && isComment(right)) {
		return false;
	}

	if (rightText === '') {
		return true;
	}

	const firstCharacter = rightText[0];

	if (WORD_CHARACTER.test(lastCharacter) && WORD_CHARACTER.test(firstCharacter)) {
		return false;
	}

	if (
		(lastCharacter === '+' && firstCharacter === '+')
		|| (lastCharacter === '-' && firstCharacter === '-')
	) {
		return false;
	}

	if (
		(isUnsafeNumericDotLeft(left) && firstCharacter === '.')
		|| (TRAILING_DIGIT_DOT.test(leftText) && WORD_CHARACTER.test(firstCharacter))
	) {
		return false;
	}

	return !(lastCharacter === '/' && (firstCharacter === '/' || firstCharacter === '*'));
}
