function * addParenthesizesToReturnOrThrowExpression(fixer, node, effectedNodeOrToken, sourceCode) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const returnOrThrowToken = sourceCode.getFirstToken(node);
	if (returnOrThrowToken.loc.start.line === effectedNodeOrToken.loc.start.line) {
		return;
	}

	yield fixer.insertTextAfter(returnToken, ' (');
	yield fixer.insertTextAfter(newExpression, ')');
}

module.exports = addParenthesizesToReturnOrThrowExpression
