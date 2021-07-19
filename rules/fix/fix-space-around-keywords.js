'use strict';

function * fixSpaceAroundKeyword(fixer, node, sourceCode) {
	const {parent} = node;
	let keyword;
	let side = 'after';

	switch (parent.type) {
		case 'YieldExpression':
			if (parent.delegate) {
				break;
			}
			// Fallthrough
		case 'ReturnStatement':
		case 'ThrowStatement':
		case 'AwaitExpression':
		case 'YieldExpression': {
			/* istanbul ignore else */
			if (parent.argument === node) {
				keyword = sourceCode.getFirstToken(parent);
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
				keyword = sourceCode.getFirstToken(parent);
			}
			break;
		}
		case 'BinaryExpression': {
			const {operator, left, right} = parent;
			/* istanbul ignore else */
			if (
				operator === 'in' ||
				operator === 'instanceof'
			) {
				keyword = sourceCode.getTokenAfter(left, {filter: token => token.type === 'Keyword' && token.value === operator});

				if (left === node) {
					side = 'before';
				}
			}
			break;
		}
		case 'ExportDefaultDeclaration': {
			/* istanbul ignore else */
			if (parent.declaration === node) {
				keyword = sourceCode.getFirstToken(parent, {filter: token => token.type === 'Keyword' && token.value === 'default'});
			}
			break;
		}
		case 'ExpressionStatement': {
			/* istanbul ignore else */
			if (parent.expression === node) {
				return fixSpaceAroundKeyword(fixer, parent, sourceCode);
			}
			break;
		}
		case 'IfStatement': {
			if (parent.alternate === node) {
				keyword = sourceCode.getFirstBefore(node, {filter: token => token.type === 'Keyword' && token.value === 'else'});
			}
			break;
		}
		case 'DoWhileStatement': {
			if (parent.body === node) {
				keyword = sourceCode.getFirstToken(parent);
			}
			break;
		}
		case 'SwitchCase': {
			if (parent.test === node) {
				keyword = sourceCode.getTokenBefore(node, {filter: token => token.type === 'Keyword' && token.value === 'case'});
			}
			break;
		}
		case 'VariableDeclarator': {
			const grandParent = parent.parent;
			if (
				grandParent.type === 'VariableDeclaration' &&
				grandParent.declarations[0] === parent
			) {
				keyword = sourceCode.getFirstToken(grandParent);
			}
			break;
		}
	}

	if (!keyword) {
		return;
	}

	const characterIndex = side === 'before' ?
		keyword.range[0] - 1 :
		keyword.range[1];

	if (sourceCode.text.charAt(characterIndex) !== ' ') {
		yield fixer[side === 'before' ? 'insertTextBefore' : 'insertTextAfter'](keyword, ' ');
	}
}

module.exports = fixSpaceAroundKeyword;
