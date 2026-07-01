import {isMethodCall} from './ast/index.js';
import {
	hasCommentInRange,
	hasDirectBlockScopedDeclaration,
	isGlobalIdentifier,
	needsSemicolon,
	trackBranchExits,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-else';
const messages = {
	[MESSAGE_ID]: 'Unexpected `else` after a statement that exits.',
};

const statementListParentTypes = new Set([
	'Program',
	'BlockStatement',
	'StaticBlock',
	'SwitchCase',
]);

const asiHazardCharacters = new Set([
	'[',
	'(',
	'<',
	'/',
	'`',
	'+',
	'-',
]);

const getLineIndent = (sourceCode, index) => {
	const lineStart = sourceCode.text.lastIndexOf('\n', index - 1) + 1;
	return /^[\t ]*/.exec(sourceCode.text.slice(lineStart, index))[0];
};

const startsWithAsiHazard = token => asiHazardCharacters.has(token.value[0]);

const isJsxChildTextToken = (token, sourceCode) =>
	token.type === 'JSXText'
	&& sourceCode.getNodeByRangeIndex(sourceCode.getRange(token)[0]).type === 'JSXText';

const isProcessExitCall = (node, context) =>
	isMethodCall(node, {
		object: 'process',
		method: 'exit',
		optionalCall: false,
		optionalMember: false,
	})
	&& isGlobalIdentifier(node.callee.object, context);

const isProcessExitStatement = (node, context) =>
	node.type === 'ExpressionStatement'
	&& isProcessExitCall(node.expression, context);

function branchExits(branch, context, branchAlwaysExits) {
	if (branchAlwaysExits(branch) || isProcessExitStatement(branch, context)) {
		return true;
	}

	if (branch.type === 'BlockStatement') {
		const lastStatement = branch.body.at(-1);
		return Boolean(lastStatement && branchExits(lastStatement, context, branchAlwaysExits));
	}

	return branch.type === 'IfStatement'
		&& branch.alternate
		&& branchExits(branch.consequent, context, branchAlwaysExits)
		&& branchExits(branch.alternate, context, branchAlwaysExits);
}

// A multiline token's internal whitespace can be meaningful, so it can't be safely reindented.
// JSX child text is safe because JSX collapses line-leading and line-trailing whitespace at compile time.
const hasReindentUnsafeMultilineToken = (node, context) => {
	const {sourceCode} = context;
	return sourceCode.getTokens(node).some(token =>
		!isJsxChildTextToken(token, sourceCode)
		&& sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line,
	);
};

const getBlockBodyText = (blockStatement, ifStatement, sourceCode) => {
	const openingBrace = sourceCode.getFirstToken(blockStatement);
	const closingBrace = sourceCode.getLastToken(blockStatement);
	const bodyText = sourceCode.text.slice(sourceCode.getRange(openingBrace)[1], sourceCode.getRange(closingBrace)[0]);

	if (!bodyText.includes('\n')) {
		const trimmedBodyText = bodyText.trim();
		return trimmedBodyText ? `\n${getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0])}${trimmedBodyText}` : '';
	}

	const lines = bodyText.split('\n');

	if (lines[0]?.trim() === '') {
		lines.shift();
	}

	if (lines.at(-1)?.trim() === '') {
		lines.pop();
	}

	if (lines.length === 0) {
		return '';
	}

	const firstBodyToken = sourceCode.getTokenAfter(openingBrace, {includeComments: true});
	const ifIndent = getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0]);
	const bodyIndent = firstBodyToken && firstBodyToken !== closingBrace
		? getLineIndent(sourceCode, sourceCode.getRange(firstBodyToken)[0])
		: ifIndent;

	return `\n${lines.map(line => {
		if (line.trim() === '') {
			return '';
		}

		return line.startsWith(bodyIndent)
			? `${ifIndent}${line.slice(bodyIndent.length)}`
			: `${ifIndent}${line.trimStart()}`;
	}).join('\n')}`;
};

const getReplacementText = (ifStatement, sourceCode) => {
	const {alternate} = ifStatement;

	if (alternate.type === 'BlockStatement') {
		return getBlockBodyText(alternate, ifStatement, sourceCode);
	}

	const ifIndent = getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0]);
	return `\n${ifIndent}${sourceCode.getText(alternate)}`;
};

const hasSameLineFollowingTokenOrComment = (node, sourceCode) => {
	const nextToken = sourceCode.getTokenAfter(node);
	if (
		nextToken
		&& sourceCode.getLoc(node).end.line === sourceCode.getLoc(nextToken).start.line
	) {
		return true;
	}

	const nextComment = sourceCode.getCommentsAfter(node)[0];
	return Boolean(
		nextComment
		&& sourceCode.getLoc(node).end.line === sourceCode.getLoc(nextComment).start.line,
	);
};

const isSafeToMoveAlternate = (ifStatement, context) => {
	const {sourceCode} = context;
	const {alternate, consequent} = ifStatement;
	const firstAlternateToken = alternate.type === 'BlockStatement'
		? sourceCode.getTokenAfter(sourceCode.getFirstToken(alternate))
		: sourceCode.getFirstToken(alternate);

	if (!firstAlternateToken) {
		return true;
	}

	const lastConsequentToken = sourceCode.getLastToken(consequent);
	if (
		consequent.type !== 'BlockStatement'
		&& lastConsequentToken.value !== ';'
		&& (
			needsSemicolon(lastConsequentToken, context, firstAlternateToken.value)
			|| startsWithAsiHazard(firstAlternateToken)
		)
	) {
		return false;
	}

	if (hasSameLineFollowingTokenOrComment(alternate, sourceCode)) {
		return false;
	}

	const lastAlternateToken = alternate.type === 'BlockStatement'
		? sourceCode.getTokenBefore(sourceCode.getLastToken(alternate))
		: sourceCode.getLastToken(alternate);
	const nextToken = sourceCode.getTokenAfter(alternate);
	return !(
		lastAlternateToken
		&& lastAlternateToken.value !== ';'
		&& nextToken
		&& (
			needsSemicolon(lastAlternateToken, context, nextToken.value)
			|| startsWithAsiHazard(nextToken)
		)
	);
};

const fix = (ifStatement, context) => fixer => {
	const {sourceCode} = context;
	const {alternate, consequent} = ifStatement;

	if (
		hasDirectBlockScopedDeclaration(alternate)
		|| (
			alternate.type === 'BlockStatement'
			&& hasReindentUnsafeMultilineToken(alternate, context)
		)
		|| !isSafeToMoveAlternate(ifStatement, context)
	) {
		return;
	}

	const replacementRange = [
		sourceCode.getRange(consequent)[1],
		sourceCode.getRange(alternate)[1],
	];

	if (hasCommentInRange(context, [replacementRange[0], sourceCode.getRange(alternate)[0]])) {
		return;
	}

	return fixer.replaceTextRange(replacementRange, getReplacementText(ifStatement, sourceCode));
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const branchAlwaysExits = trackBranchExits(context, branch => branchExits(branch, context, branchAlwaysExits));

	context.onExit('IfStatement', ifStatement => {
		if (!(
			ifStatement.alternate
			&& statementListParentTypes.has(ifStatement.parent.type)
			&& branchAlwaysExits(ifStatement.consequent)
		)) {
			return;
		}

		const elseToken = sourceCode.getTokenBefore(ifStatement.alternate);

		return {
			node: ifStatement.alternate,
			loc: sourceCode.getLoc(elseToken),
			messageId: MESSAGE_ID,
			fix: fix(ifStatement, context),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `else` after a statement that exits.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
