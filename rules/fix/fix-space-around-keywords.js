'use strict';

const isKeywordToken = value => token => token.type === 'Keyword' && token.value === value;

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
		case 'AwaitExpression': {
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
			const {operator, left} = parent;
			/* istanbul ignore else */
			if (
				operator === 'in' ||
				operator === 'instanceof'
			) {
				keyword = sourceCode.getTokenAfter(left, {filter: isKeywordToken(operator)});

				if (left === node) {
					side = 'before';
				}
			}

			break;
		}

		case 'ExportDefaultDeclaration': {
			/* istanbul ignore else */
			if (parent.declaration === node) {
				keyword = sourceCode.getFirstToken(parent, {filter: isKeywordToken('default')});
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
				keyword = sourceCode.getTokenBefore(node, {filter: isKeywordToken('else')});
			}

			break;
		}

		case 'DoWhileStatement': {
			/* istanbul ignore else */
			if (parent.body === node) {
				keyword = sourceCode.getFirstToken(parent);
			}

			break;
		}

		case 'SwitchCase': {
			/* istanbul ignore else */
			if (parent.test === node) {
				keyword = sourceCode.getTokenBefore(node, {filter: isKeywordToken('case')});
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

		// No default
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
