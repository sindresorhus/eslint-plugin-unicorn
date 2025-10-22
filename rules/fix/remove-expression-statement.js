function removeExpressionStatement(node, fixer, context) {
  const {sourceCode} = context;
  const {line} = sourceCode.getLoc(node).start;
  const lines = sourceCode.lines;
  const lineText = lines[line - 1];
  const range = lineText.trim() === sourceCode.getText(node)
    ? [
        sourceCode.getIndexFromLoc({line, column: 0}),
        line === lines.length
          ? sourceCode.getRange(node)[1]
          : sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
      ]
    : sourceCode.getRange(node)
  return fixer.removeRange(range);
}

export default removeExpressionStatement