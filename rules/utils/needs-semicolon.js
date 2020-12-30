'use strict';

// https://github.com/eslint/espree/blob/6b7d0b8100537dcd5c84a7fb17bbe28edcabe05d/lib/token-translator.js#L20
const tokenTypesNeedsSemicolon = new Set([
	'String',
	'Null',
	'Boolean',
	'Numeric',
	'RegularExpression'
]);

const charactersMightNeedsSemicolon = new Set([
	'[',
	'(',
	'/',
	'`',
	'+',
	'-',
	'*',
	',',
	'.'
]);

/**
Determines if a semicolon needs to be inserted before `code`, in order to avoid a SyntaxError.

@param {Token} tokenBefore Token before `code`.
@param {SourceCode} sourceCode
@param {String} [code] Code text to determine.
@returns {boolean} `true` if a semicolon needs to be inserted before `code`.
*/

function needsSemicolon(tokenBefore, sourceCode, code) {
	if (
		code === '' ||
		(code && !charactersMightNeedsSemicolon.has(code.charAt(0)))
	) {
		return false;
	}

	if (!tokenBefore) {
		return false;
	}

	const {type, value, range} = tokenBefore;
	if (type === 'Punctuator') {
		if (value === ';') {
			return false;
		}

		if (value === ']' || value === ')') {
			return true;
		}
	}

	if (tokenTypesNeedsSemicolon.has(type)) {
		return true;
	}

	if (type === 'Template') {
		return value.endsWith('`');
	}

	const lastBlockNode = sourceCode.getNodeByRangeIndex(range[0]);
	if (lastBlockNode && lastBlockNode.type === 'ObjectExpression') {
		return true;
	}

	if (type === 'Identifier') {
		// `for...of`
		if (value === 'of' && lastBlockNode && lastBlockNode.type === 'ForOfStatement') {
			return false;
		}

		// `await`
		if (value === 'await' && lastBlockNode && lastBlockNode.type === 'AwaitExpression') {
			return false;
		}

		return true;
	}

	return false;
}

module.exports = needsSemicolon;
