import {isSemicolonToken} from '@eslint-community/eslint-utils';

const isWhitespaceOnly = text => /^\s*$/.test(text);

// Removes a statement node along with its surrounding whitespace, while preserving comments.
function removeStatement(statement, context, fixer, preserveSemiColon = false) {
	const {sourceCode} = context;
	const {lines} = sourceCode;
	let endToken = statement;

	if (preserveSemiColon) {
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(statement, 2);

		if (isSemicolonToken(lastToken)) {
			endToken = penultimateToken;
		}
	}

	const startLocation = sourceCode.getLoc(statement).start;
	const endLocation = sourceCode.getLoc(endToken).end;

	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);

	let [start] = sourceCode.getRange(statement);
	let [, end] = sourceCode.getRange(endToken);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		end += textAfter.length;

		if (start === 0) {
			// At the start of the file there is no preceding newline to absorb, so take the trailing one instead.
			const {text} = sourceCode;

			if (text[end] === '\r' && text[end + 1] === '\n') {
				end += 2;
			} else if (text[end] === '\n' || text[end] === '\r') {
				end++;
			}
		} else {
			start = Math.max(0, start - textBefore.length - 1);
		}
	}

	return fixer.removeRange([start, end]);
}

export default removeStatement;
