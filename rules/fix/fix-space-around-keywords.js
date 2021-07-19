'use strict';

const isKeywordToken = value => token => token.type === 'Keyword' && token.value === value;

function * fixSpaceAroundKeyword(fixer, node, sourceCode) {
	const {parent} = node;
	const keywords = [];

	switch (parent.type) {
		case 'YieldExpression':
			if (parent.delegate) {
				break;
			}
			// Fallthrough

		case 'ReturnStatement':
		case 'ThrowStatement':
		case 'AwaitExpression': {
			/* istanbul ignore else */
			if (parent.argument === node) {
				keywords.push({
					keyword: sourceCode.getFirstToken(parent),
					side: 'after',
				});
			}

			break;
		}

		case 'UnaryExpression': {
			const {operator, prefix, argument: unaryExpressionArgument} = parent;
			/* istanbul ignore else */
			if (
				(
					operator === 'typeof' ||
					operator === 'void' ||
					operator === 'delete'
				) &&
				prefix &&
				unaryExpressionArgument === node
			) {
				keywords.push({
					keyword: sourceCode.getFirstToken(parent),
					side: 'after',
				});
			}

			break;
		}

		case 'BinaryExpression': {
			const {operator, left} = parent;
			/* istanbul ignore else */
			if (
				operator === 'in' ||
				operator === 'instanceof'
			) {
				keywords.push({
					keyword: sourceCode.getTokenAfter(left, {filter: isKeywordToken(operator)}),
					side: left === node ? 'before' : 'after',
				});
			}

			break;
		}

		case 'ExportDefaultDeclaration': {
			/* istanbul ignore else */
			if (parent.declaration === node) {
				keywords.push({
					keyword: sourceCode.getFirstToken(parent, {filter: isKeywordToken('default')}),
					side: 'after',
				});
			}

			break;
		}

		case 'ExpressionStatement': {
			/* istanbul ignore else */
			if (parent.expression === node) {
				yield * fixSpaceAroundKeyword(fixer, parent, sourceCode);
				return;
			}

			break;
		}

		case 'IfStatement': {
			/* istanbul ignore else */
			if (parent.alternate === node) {
				keywords.push({
					keyword: sourceCode.getTokenBefore(node, {filter: isKeywordToken('else')}),
					side: 'after',
				});
			}

			break;
		}

		case 'DoWhileStatement': {
			/* istanbul ignore else */
			if (parent.body === node) {
				keywords.push({
					keyword: sourceCode.getFirstToken(parent),
					side: 'after',
				});
			}

			break;
		}

		case 'SwitchCase': {
			/* istanbul ignore else */
			if (parent.test === node) {
				keywords.push({
					keyword: sourceCode.getTokenBefore(node, {filter: isKeywordToken('case')}),
					side: 'after',
				});
			}

			break;
		}

		case 'VariableDeclarator': {
			const grandParent = parent.parent;
			if (
				grandParent.type === 'VariableDeclaration' &&
				grandParent.declarations[0] === parent
			) {
				keywords.push({
					keyword: sourceCode.getFirstToken(grandParent),
					side: 'after',
				});
			}

			break;
		}

		case 'ForOfStatement': {
			// Note: Other keywords and children not handled, because not using
			if (parent.right === node) {
				keywords.push({
					keyword: sourceCode.getTokenBefore(node, {filter: ({type, value}) => type === 'Identifier' && value === 'of'}),
					side: 'after',
				});
			}

			break;
		}

		// No default
	}

	for (const {keyword, side} of keywords) {
		const characterIndex = side === 'before' ?
			keyword.range[0] - 1 :
			keyword.range[1];

		if (sourceCode.text.charAt(characterIndex) !== ' ') {
			yield fixer[side === 'before' ? 'insertTextBefore' : 'insertTextAfter'](keyword, ' ');
		}
	}
}

module.exports = fixSpaceAroundKeyword;
