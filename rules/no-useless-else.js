import {
	getLinebreak,
	getUnwrappedBranchText,
	hasCommentInRange,
	hasDirectBlockScopedDeclaration,
	isBranchExit,
	needsSemicolon,
	trackBranchExits,
} from './utils/index.js';
import {extendFixRange} from './fix/index.js';

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

const startsWithAsiHazard = token => asiHazardCharacters.has(token.value[0]);

const isJsxChildTextToken = (token, sourceCode) =>
	token.type === 'JSXText'
	&& sourceCode.getNodeByRangeIndex(sourceCode.getRange(token)[0]).type === 'JSXText';

// A multiline token's internal whitespace can be meaningful, so it can't be safely reindented.
// JSX child text is safe because JSX collapses line-leading and line-trailing whitespace at compile time.
const hasReindentUnsafeMultilineToken = (node, context) => {
	const {sourceCode} = context;
	return sourceCode.getTokens(node).some(token =>
		!isJsxChildTextToken(token, sourceCode)
		&& sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line,
	);
};

const getReplacementText = (ifStatement, context) => {
	const text = getUnwrappedBranchText(ifStatement.alternate, context);
	return text ? `${getLinebreak(context)}${text}` : '';
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

const fix = (ifStatement, context) => function * (fixer) {
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

	const consequentRange = sourceCode.getRange(consequent);
	const replacementRange = [
		consequentRange[1],
		sourceCode.getRange(alternate)[1],
	];

	if (hasCommentInRange(context, [replacementRange[0], sourceCode.getRange(alternate)[0]])) {
		return;
	}

	yield fixer.replaceTextRange(replacementRange, getReplacementText(ifStatement, context));
	// Prevent other rules from changing the branch whose exit makes the `else` useless.
	yield extendFixRange(fixer, consequentRange);
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const branchAlwaysExits = trackBranchExits(context, branch => isBranchExit(branch, context, branchAlwaysExits));

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

/**
@type {ESLint.Rule.RuleModule}
*/
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
