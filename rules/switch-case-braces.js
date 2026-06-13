import {isColonToken} from '@eslint-community/eslint-utils';
import getSwitchCaseHeadLocation from './utils/get-switch-case-head-location.js';
import getIndentString from './utils/get-indent-string.js';
import {getLastTrailingCommentOnSameLine} from './utils/index.js';
import {replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';

const MESSAGE_ID_EMPTY_CLAUSE = 'switch-case-braces/empty';
const MESSAGE_ID_MISSING_BRACES = 'switch-case-braces/missing';
const MESSAGE_ID_UNNECESSARY_BRACES = 'switch-case-braces/unnecessary';
const messages = {
	[MESSAGE_ID_EMPTY_CLAUSE]: 'Unexpected braces in empty case clause.',
	[MESSAGE_ID_MISSING_BRACES]: 'Missing braces in case clause.',
	[MESSAGE_ID_UNNECESSARY_BRACES]: 'Unnecessary braces in case clause.',
};

const OPTION_AVOID = 'avoid';
const OPTION_SINGLE_STATEMENT = 'single-statement';

const declarationTypesRequiringBlock = new Set([
	'ClassDeclaration',
	'FunctionDeclaration',
	'TSDeclareFunction',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSModuleDeclaration',
	'TSTypeAliasDeclaration',
]);

const needsCaseBlock = node =>
	(
		node.type === 'VariableDeclaration'
		&& node.kind !== 'var'
	)
	|| declarationTypesRequiringBlock.has(node.type);

const isDeclarationAllowedInAvoidBlock = node =>
	node.type === 'VariableDeclaration'
	|| declarationTypesRequiringBlock.has(node.type);

function getLastBlockBodyToken(blockStatement, context) {
	const {sourceCode} = context;
	const lastStatement = blockStatement.body.at(-1);
	const lastBodyToken = lastStatement
		? getLastTrailingCommentOnSameLine(context, lastStatement) ?? sourceCode.getLastToken(lastStatement)
		: sourceCode.getFirstToken(blockStatement);
	const lastComment = sourceCode.getCommentsInside(blockStatement).at(-1);

	if (
		lastComment
		&& sourceCode.getRange(lastComment)[0] > sourceCode.getRange(lastBodyToken)[1]
	) {
		return lastComment;
	}

	return lastBodyToken;
}

function * removeBraces(fixer, node, context, abort) {
	const {sourceCode} = context;
	const [blockStatement] = node.consequent;
	const closingBraceToken = sourceCode.getLastToken(blockStatement);
	if (getLastTrailingCommentOnSameLine(context, closingBraceToken)) {
		return abort();
	}

	const openingBraceToken = sourceCode.getFirstToken(blockStatement);
	yield replaceNodeOrTokenAndSpacesBefore(openingBraceToken, '', fixer, context);

	const lastBlockToken = getLastBlockBodyToken(blockStatement, context);
	yield fixer.removeRange([sourceCode.getRange(lastBlockToken)[1], sourceCode.getRange(closingBraceToken)[1]]);
}

function * addBraces(fixer, node, context) {
	const {sourceCode} = context;
	const colonToken = sourceCode.getTokenAfter(
		node.test || sourceCode.getFirstToken(node),
		isColonToken,
	);
	yield fixer.insertTextAfter(colonToken, ' {');

	const lastConsequent = node.consequent.at(-1);
	const lastToken = getLastTrailingCommentOnSameLine(context, lastConsequent) ?? sourceCode.getLastToken(lastConsequent);
	const indent = getIndentString(node, context);
	yield fixer.insertTextAfter(lastToken, `\n${indent}}`);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const option = context.options[0];
	const isBracesRequired = option !== OPTION_AVOID && option !== OPTION_SINGLE_STATEMENT;
	const {sourceCode} = context;

	context.on('SwitchCase', node => {
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
				loc: sourceCode.getLoc(sourceCode.getFirstToken(consequent[0])),
				messageId: MESSAGE_ID_EMPTY_CLAUSE,
				fix: (fixer, {abort}) => removeBraces(fixer, node, context, abort),
			};
		}

		if (option === OPTION_SINGLE_STATEMENT) {
			if (consequent.length > 1) {
				const problem = {
					node,
					loc: getSwitchCaseHeadLocation(node, context),
					messageId: MESSAGE_ID_MISSING_BRACES,
				};

				if (consequent.every(node => !needsCaseBlock(node))) {
					problem.fix = fixer => addBraces(fixer, node, context);
				}

				return problem;
			}

			const [statement] = consequent;
			if (needsCaseBlock(statement)) {
				return {
					node,
					loc: getSwitchCaseHeadLocation(node, context),
					messageId: MESSAGE_ID_MISSING_BRACES,
				};
			}

			if (
				statement.type === 'BlockStatement'
				&& statement.body.length === 1
				&& !needsCaseBlock(statement.body[0])
			) {
				return {
					node,
					loc: sourceCode.getLoc(sourceCode.getFirstToken(statement)),
					messageId: MESSAGE_ID_UNNECESSARY_BRACES,
					fix: (fixer, {abort}) => removeBraces(fixer, node, context, abort),
				};
			}

			return;
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
				loc: getSwitchCaseHeadLocation(node, context),
				messageId: MESSAGE_ID_MISSING_BRACES,
				fix: fixer => addBraces(fixer, node, context),
			};
		}

		if (
			!isBracesRequired
			&& consequent.length === 1
			&& consequent[0].type === 'BlockStatement'
			&& consequent[0].body.every(node => !isDeclarationAllowedInAvoidBlock(node))
		) {
			return {
				node,
				loc: sourceCode.getLoc(sourceCode.getFirstToken(consequent[0])),
				messageId: MESSAGE_ID_UNNECESSARY_BRACES,
				fix: (fixer, {abort}) => removeBraces(fixer, node, context, abort),
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent brace style for `case` clauses.',
			recommended: true,
		},
		fixable: 'code',
		schema: [{enum: ['always', OPTION_AVOID, OPTION_SINGLE_STATEMENT], description: 'Whether to always require braces, avoid them when possible, or require one statement per case.'}],
		defaultOptions: ['always'],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
