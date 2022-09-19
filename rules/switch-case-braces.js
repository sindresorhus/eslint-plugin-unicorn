'use strict';
const {isColonToken} = require('eslint-utils');
const getSwitchCaseHeadLocation = require('./utils/get-switch-case-head-location.js');

const MESSAGE_ID_EMPTY = 'switch-case-braces/empty';
const MESSAGE_ID_MISSING = 'switch-case-braces/missing';
const MESSAGE_ID_UNNECESSARY = 'switch-case-braces/unnecessary';
const messages = {
	[MESSAGE_ID_EMPTY]: 'Unexpected braces in empty case clause.',
	[MESSAGE_ID_MISSING]: 'Missing braces in case clause.',
	[MESSAGE_ID_UNNECESSARY]: 'Unnecessary braces in case clause.',
};

function * removeBraces(fixer, node, sourceCode) {
	const [blockStatement] = node.consequent;
	const openingBraceToken = sourceCode.getFirstToken(blockStatement);
	yield fixer.remove(openingBraceToken);

	const closingBraceToken = sourceCode.getLastToken(blockStatement);
	yield fixer.remove(closingBraceToken);
}

function * addBraces(fixer, node, sourceCode) {
	const colonToken = sourceCode.getTokenAfter(
		node.test || sourceCode.getFirstToken(node),
		isColonToken,
	);
	yield fixer.insertTextAfter(colonToken, ' {');

	const lastToken = sourceCode.getLastToken(node);
	yield fixer.insertTextAfter(lastToken, '}');
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const isBracesRequired = context.options[0] !== 'avoid';
	const sourceCode = context.getSourceCode();

	return {
		SwitchCase(node) {
			const {consequent} = node;
			if (consequent.length === 0) {
				return;
			}

			if (
				consequent.length === 1
				&& consequent[0].type === 'BlockStatement'
				&& consequent[0].body.length === 0
			) {
				return {
					node,
					loc: getSwitchCaseHeadLocation(node, sourceCode),
					messageId: MESSAGE_ID_EMPTY,
					fix: fixer => removeBraces(fixer, node, sourceCode),
				};
			}

			if (
				isBracesRequired
				&& !(
					consequent.length === 1
					&& consequent[0].type === 'BlockStatement'
				)
			) {
				return {
					node,
					loc: getSwitchCaseHeadLocation(node, sourceCode),
					messageId: MESSAGE_ID_MISSING,
					fix: fixer => addBraces(fixer, node, sourceCode),
				};
			}

			if (
				!isBracesRequired
				&& consequent.length === 1
				&& consequent[0].type === 'BlockStatement'
				&& consequent[0].body.every(node =>
					node.type !== 'VariableDeclaration'
					&& node.type !== 'FunctionDeclaration',
				)
			) {
				return {
					node,
					loc: getSwitchCaseHeadLocation(node, sourceCode),
					messageId: MESSAGE_ID_UNNECESSARY,
					fix: fixer => removeBraces(fixer, node, sourceCode),
				};
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent brace style for `case` clauses.',
		},
		fixable: 'code',
		schema: [{enum: ['always', 'avoid']}],
		messages,
	},
};
