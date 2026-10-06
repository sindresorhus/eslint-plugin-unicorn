import {isSemicolonToken} from '@eslint-community/eslint-utils';

const isWhitespaceOnly = text => /^\s*$/.test(text);

/**
Remove a statement, or an array of consecutive statements (first to last), along with the surrounding whitespace, while preserving comments.

@param {import('estree').Statement | import('estree').Statement[]} statements - A statement, or an array of consecutive statements. Everything from the first to the last statement is removed, including comments between them.
@param {import('eslint').Rule.RuleContext} context
@param {import('eslint').Rule.RuleFixer} fixer
@param {boolean} [preserveSemiColon] - Keep the semicolon of the last statement.
@returns {import('eslint').Rule.Fix}
*/
export default function removeStatement(statements, context, fixer, preserveSemiColon = false) {
	const {sourceCode} = context;
	const {lines} = sourceCode;
	const [firstStatement, lastStatement] = Array.isArray(statements) ? [statements[0], statements.at(-1)] : [statements, statements];
	let endToken = lastStatement;

	if (preserveSemiColon) {
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(lastStatement, 2);

		if (isSemicolonToken(lastToken)) {
			endToken = penultimateToken;
		}
	}

	const startLocation = sourceCode.getLoc(firstStatement).start;
	const endLocation = sourceCode.getLoc(endToken).end;

	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);

	let [start] = sourceCode.getRange(firstStatement);
	let [, end] = sourceCode.getRange(endToken);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		end += textAfter.length;

		// A line terminator can be a two-character `\r\n`, so it has to be measured instead of assumed
		const {text} = sourceCode;

		// Absorb the own line, including its indentation
		start = sourceCode.getIndexFromLoc({line: startLocation.line, column: 0});

		if (start === 0) {
			// On the first line there is no preceding line terminator to absorb, so take the trailing one instead, unless it is the end of the file.
			end += text.startsWith('\r\n', end) ? 2 : Math.min(1, text.length - end);
		} else {
			// And the line terminator before it, a line always starts right after one
			start -= text.startsWith('\r\n', start - 2) ? 2 : 1;
		}
	}

	return fixer.removeRange([start, end]);
}
