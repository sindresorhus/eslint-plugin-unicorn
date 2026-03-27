import {isCommentToken} from '@eslint-community/eslint-utils';
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
			...(lastStatement.type !== 'ReturnStatement' && lastStatement.type !== 'ThrowStatement' && {
				* fix(fixer) {
					// Skip fix if there are comments between the block and the terminating statement
					const closingBrace = sourceCode.getLastToken(blockStatement);
					const hasComments = sourceCode.getTokensBetween(closingBrace, lastStatement, {includeComments: true})
						.some(token => isCommentToken(token));
					if (hasComments) {
						return;
					}

					// Skip fix for single-line blocks (produces malformed output)
					const blockLoc = sourceCode.getLoc(blockStatement);
					if (blockLoc.start.line === blockLoc.end.line) {
						return;
					}

					// Skip fix if the terminator has trailing same-line comments
					const trailingComments = sourceCode.getCommentsAfter(lastStatement);
					const terminatorLine = sourceCode.getLoc(lastStatement).end.line;
					if (trailingComments.some(comment => sourceCode.getLoc(comment).start.line === terminatorLine)) {
						return;
					}

					const lastBodyStatement = blockStatement.body.at(-1);
					const terminatingStatementText = sourceCode.getText(lastStatement);
					const bodyIndent = getIndentString(lastBodyStatement, context);

					// Insert before the closing brace, after the last token (including any comments)
					// This preserves comment attachment to the original statements
					const lastTokenBeforeBrace = sourceCode.getTokenBefore(closingBrace, {includeComments: true});
					yield fixer.insertTextAfter(
						lastTokenBeforeBrace,
						`\n${bodyIndent}${terminatingStatementText}`,
					);

					// Remove the terminating statement and whitespace between it and the closing brace
					const closingBraceEnd = sourceCode.getRange(closingBrace)[1];
					const terminatingEnd = sourceCode.getRange(lastStatement)[1];
					yield fixer.removeRange([closingBraceEnd, terminatingEnd]);
				},
			}),
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
