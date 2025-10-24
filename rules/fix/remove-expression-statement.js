const isWhitespaceOnly = text => /^\s*$/.test(text);

function removeExpressionStatement(expressionStatement, context, fixer) {
	const {sourceCode} = context;
	const {lines} = sourceCode;
	const {
		start: startLocation,
		end: endLocation,
	} = sourceCode.getLoc(expressionStatement);

	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);
	let [start, end] = sourceCode.getRange(expressionStatement);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		start = Math.max(0, start - textBefore.length - 1);
		end += textAfter.length;
	}

	return fixer.removeRange([start, end]);
}

export default removeExpressionStatement;
