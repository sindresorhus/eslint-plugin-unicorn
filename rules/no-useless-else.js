import {needsSemicolon} from './utils/index.js';

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

const exitingStatementTypes = new Set([
	'ReturnStatement',
	'ThrowStatement',
	'BreakStatement',
	'ContinueStatement',
]);

const asiHazardCharacters = new Set([
	'[',
	'(',
	'/',
	'`',
	'+',
	'-',
]);

const blockScopedDeclarationTypes = new Set([
	'ClassDeclaration',
	'FunctionDeclaration',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSModuleDeclaration',
	'TSTypeAliasDeclaration',
]);

const getLineIndent = (sourceCode, index) => {
	const lineStart = sourceCode.text.lastIndexOf('\n', index - 1) + 1;
	return /^[\t ]*/.exec(sourceCode.text.slice(lineStart, index))[0];
};

const isBlockScopedDeclaration = node =>
	(
		node.type === 'VariableDeclaration'
		&& node.kind !== 'var'
	)
	|| blockScopedDeclarationTypes.has(node.type);

const hasDirectBlockScopedDeclaration = node =>
	isBlockScopedDeclaration(node)
	|| (
		node.type === 'BlockStatement'
		&& node.body.some(node => isBlockScopedDeclaration(node))
	);

const isAlwaysExiting = node => {
	if (exitingStatementTypes.has(node.type)) {
		return true;
	}

	if (node.type === 'BlockStatement') {
		return node.body.some(node => isAlwaysExiting(node));
	}

	return Boolean(
		node.type === 'IfStatement'
		&& node.alternate
		&& isAlwaysExiting(node.consequent)
		&& isAlwaysExiting(node.alternate),
	);
};

const hasCommentInRange = (sourceCode, [start, end]) =>
	sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});

const startsWithAsiHazard = token => asiHazardCharacters.has(token.value[0]);

const hasRawMultilineLiteralHazard = (node, sourceCode) => {
	if (
		node.type === 'TemplateLiteral'
		|| (
			node.type === 'Literal'
			&& typeof node.value === 'string'
			&& /\\\r?\n/u.test(sourceCode.getText(node))
		)
		|| (
			node.type === 'JSXText'
			&& node.value.includes('\n')
		)
	) {
		return true;
	}

	for (const key of sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		if (Array.isArray(value)) {
			if (value.some(childNode => childNode && hasRawMultilineLiteralHazard(childNode, sourceCode))) {
				return true;
			}
		} else if (value && hasRawMultilineLiteralHazard(value, sourceCode)) {
			return true;
		}
	}

	return false;
};

const getBlockBodyText = (blockStatement, ifStatement, sourceCode) => {
	const openingBrace = sourceCode.getFirstToken(blockStatement);
	const closingBrace = sourceCode.getLastToken(blockStatement);
	const bodyText = sourceCode.text.slice(sourceCode.getRange(openingBrace)[1], sourceCode.getRange(closingBrace)[0]);
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

const isSafeFromAutomaticSemicolonInsertion = (ifStatement, context) => {
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

	const lastAlternateToken = alternate.type === 'BlockStatement'
		? sourceCode.getTokenBefore(sourceCode.getLastToken(alternate))
		: sourceCode.getLastToken(alternate);
	const nextToken = sourceCode.getTokenAfter(alternate);
	if (
		nextToken
		&& sourceCode.getLoc(alternate).end.line === sourceCode.getLoc(nextToken).start.line
	) {
		return false;
	}

	return !(
		lastAlternateToken
		&& lastAlternateToken.value !== ';'
		&& nextToken
		&& needsSemicolon(lastAlternateToken, context, nextToken.value)
	);
};

const fix = (ifStatement, context) => fixer => {
	const {sourceCode} = context;
	const {alternate, consequent} = ifStatement;

	if (
		hasDirectBlockScopedDeclaration(alternate)
		|| (
			alternate.type === 'BlockStatement'
			&& hasRawMultilineLiteralHazard(alternate, sourceCode)
		)
		|| !isSafeFromAutomaticSemicolonInsertion(ifStatement, context)
	) {
		return null;
	}

	const replacementRange = [
		sourceCode.getRange(consequent)[1],
		sourceCode.getRange(alternate)[1],
	];

	if (hasCommentInRange(sourceCode, [replacementRange[0], sourceCode.getRange(alternate)[0]])) {
		return null;
	}

	return fixer.replaceTextRange(replacementRange, getReplacementText(ifStatement, sourceCode));
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', ifStatement => {
		if (!(
			ifStatement.alternate
			&& statementListParentTypes.has(ifStatement.parent.type)
			&& isAlwaysExiting(ifStatement.consequent)
		)) {
			return;
		}

		const elseToken = context.sourceCode.getTokenBefore(ifStatement.alternate);

		return {
			node: ifStatement.alternate,
			loc: context.sourceCode.getLoc(elseToken),
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
