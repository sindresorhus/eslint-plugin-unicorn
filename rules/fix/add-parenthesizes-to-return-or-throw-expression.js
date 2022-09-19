const {isSemicolonToken} = require('eslint-utils')

function * addParenthesizesToReturnOrThrowExpression(fixer, node, effectedNodeOrToken, sourceCode) {
	if (node.type !== 'ReturnStatement' && node.type !== 'ThrowStatement') {
		return;
	}

	const returnOrThrowToken = sourceCode.getFirstToken(node);
	if (returnOrThrowToken.loc.start.line !== effectedNodeOrToken.loc.start.line) {
		return;
	}

	yield fixer.insertTextAfter(returnOrThrowToken, ' (');

	const lastToken = sourceCode.getLastToken(node);
	if (isSemicolonToken(lastToken)) {
		yield fixer.insertTextBefore(lastToken, ')');
	} else {
		yield fixer.insertTextAfter(node, ')');
	}
}

module.exports = addParenthesizesToReturnOrThrowExpression
