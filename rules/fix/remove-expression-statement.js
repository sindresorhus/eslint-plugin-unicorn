const isWhitespaceOnly = text => /^\s$/.test(text);

function removeExpressionStatement(node, fixer, context) {
  const {sourceCode} = context;
  const lines = sourceCode.lines;
  const {
    start: startLocation,
    end: endLocation
  } = sourceCode.getLoc(node);

  const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
  const textAfter = lines[endLocation.line - 1].slice(endLocation.column);
  let [start, end] = sourceCode.getRange(node);

  if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
    start = Math.max(0, start + textBefore.length);
    end += textAfter.length;
  }

  return fixer.removeRange([start, end]);
}

export default removeExpressionStatement