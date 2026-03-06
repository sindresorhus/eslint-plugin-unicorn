import {isCommentToken} from '@eslint-community/eslint-utils';
import {replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';
import getIndentString from './utils/get-indent-string.js';

const MESSAGE_ID = 'switch-case-break-position';
const messages = {
	[MESSAGE_ID]: 'Move `{{keyword}}` inside the block statement.',
};

const TERMINATING_STATEMENT_TYPES = new Set([
	'BreakStatement',
	'ReturnStatement',
	'ContinueStatement',
	'ThrowStatement',
]);

function getKeyword(node) {
	switch (node.type) {
		case 'BreakStatement': {
			return 'break';
		}

		case 'ReturnStatement': {
			return 'return';
		}

		case 'ContinueStatement': {
			return 'continue';
		}

		case 'ThrowStatement': {
			return 'throw';
		}

		// No default
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('SwitchCase', node => {
		const {consequent} = node;

		if (consequent.length < 2) {
			return;
		}

		const lastStatement = consequent.at(-1);

		if (!TERMINATING_STATEMENT_TYPES.has(lastStatement.type)) {
			return;
		}

		// Check if there's a BlockStatement before the terminating statement
		// The block must be the only other statement (ignoring the terminating one)
		const statementsBeforeTerminating = consequent.slice(0, -1);

		if (
			statementsBeforeTerminating.length !== 1
			|| statementsBeforeTerminating[0].type !== 'BlockStatement'
		) {
			return;
		}

		const blockStatement = statementsBeforeTerminating[0];

		if (blockStatement.body.length === 0) {
			return;
		}

		const keyword = getKeyword(lastStatement);

		return {
			node: lastStatement,
			loc: sourceCode.getLoc(lastStatement),
			messageId: MESSAGE_ID,
			data: {keyword},
			* fix(fixer) {
				// Skip fix if there are comments between the block and the terminating statement
				const closingBrace = sourceCode.getLastToken(blockStatement);
				const hasComments = sourceCode.getTokensBetween(closingBrace, lastStatement, {includeComments: true})
					.some(token => isCommentToken(token));
				if (hasComments) {
					return;
				}

				const lastBodyStatement = blockStatement.body.at(-1);
				const terminatingStatementText = sourceCode.getText(lastStatement);
				const bodyIndent = getIndentString(lastBodyStatement, context);

				// Insert the terminating statement after the last statement in the block
				yield fixer.insertTextAfter(
					lastBodyStatement,
					`\n${bodyIndent}${terminatingStatementText}`,
				);

				// Remove the terminating statement after the block
				yield replaceNodeOrTokenAndSpacesBefore(lastStatement, '', fixer, context);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent `break`/`return`/`continue`/`throw` position in `case` clauses.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
