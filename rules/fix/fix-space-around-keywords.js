'use strict';
const {getParenthesizedRange} = require('../utils/parentheses.js');

const problematicKeywordTokens = new Set([
	// ReturnStatement
	'return',

	// ThrowStatement
	'throw',

	// AwaitExpression
	'await',

	// YieldExpression
	'yield',

	// UnaryExpression
	'typeof',
	'void',
	'delete',

	// BinaryExpression
	'in',
	'instanceof',

	// ExportDefaultDeclaration
	'default',

	// IfStatement
	'else',

	// DoWhileStatement
	'do',

	// SwitchCase
	'case',

	// VariableDeclarator
	'var',
	'let',
	'const',

	// ForInStatement
	'in',

	// ClassDeclaration & ClassExpression
	'extends',
]);

const isProblematicToken = ({type, value}) => {
	return (
		(type === 'Keyword' && problematicKeywordTokens.has(value)) ||
		// ForOfStatement
		(type === 'Identifier' && value === 'of') ||
		// AwaitExpression
		(type === 'Identifier' && value === 'await')
	);
};

function * fixSpaceAroundKeyword(fixer, node, sourceCode) {
	const range = getParenthesizedRange(node, sourceCode);
	const tokenBefore = sourceCode.getTokenBefore({range}, {includeComments: true});

	if (
		tokenBefore &&
		range[0] === tokenBefore.range[1] &&
		isProblematicToken(tokenBefore)
	) {
		yield fixer.insertTextAfter(tokenBefore, ' ');
	}

	const tokenAfter = sourceCode.getTokenAfter({range}, {includeComments: true});

	if (
		tokenAfter &&
		range[1] === tokenAfter.range[0] - 1 &&
		isProblematicToken(tokenAfter)
	) {
		yield fixer.insertTextBefore(tokenAfter, ' ');
	}
}

module.exports = fixSpaceAroundKeyword;
