import {isSemicolonToken} from '@eslint-community/eslint-utils';
const isWhitespaceOnly = text => /^\s*$/.test(text);

function removeExpressionStatement(expressionStatement, context, fixer, preserveSemiColon = false) {
	const {sourceCode} = context;
	const {lines} = sourceCode;
	let endToken = expressionStatement;

	if (preserveSemiColon) {
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(expressionStatement, 2);

		if (isSemicolonToken(lastToken)) {
			endToken = penultimateToken;
		}
	}

	const startLocation = sourceCode.getLoc(expressionStatement).start;
	const endLocation = sourceCode.getLoc(endToken).end;

	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);

	let [start] = sourceCode.getRange(expressionStatement);
	let [, end] = sourceCode.getRange(endToken);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		start = Math.max(0, start - textBefore.length - 1);
		end += textAfter.length;
	}

	return fixer.removeRange([start, end]);
}

export default removeExpressionStatement;
