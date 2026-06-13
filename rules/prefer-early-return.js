import {
	getParenthesizedText,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-early-return';
const SUGGESTION_MESSAGE_ID = 'prefer-early-return/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer an early return over wrapping the whole function body in an `if` statement.',
	[SUGGESTION_MESSAGE_ID]: 'Rewrite to an early return.',
};

const typeScriptConditionExpressionTypesRequiringParentheses = new Set([
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const blockScopedDeclarationTypes = new Set([
	'ClassDeclaration',
	'FunctionDeclaration',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSModuleDeclaration',
	'TSTypeAliasDeclaration',
]);

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			maximumStatements: {
				type: 'integer',
				minimum: 0,
				description: 'Maximum number of statements allowed in a whole-function conditional wrapper.',
			},
		},
	},
];

const getConsequentStatementCount = node => {
	if (node.consequent.type === 'EmptyStatement') {
		return 0;
	}

	return node.consequent.type === 'BlockStatement' ? node.consequent.body.length : 1;
};

const getLineIndent = (sourceCode, index) => {
	const lineStart = sourceCode.text.lastIndexOf('\n', index - 1) + 1;
	return /^[\t ]*/.exec(sourceCode.text.slice(lineStart, index))[0];
};

const isNodeInsideRange = (node, [start, end], sourceCode) => {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	return nodeStart >= start && nodeEnd <= end;
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

const hasMultilineToken = (node, sourceCode) =>
	sourceCode.getTokens(node).some(token =>
		sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line,
	);

const shouldAddParenthesesWhenNegated = node =>
	shouldAddParenthesesToUnaryExpressionArgument(node, '!')
	|| typeScriptConditionExpressionTypesRequiringParentheses.has(node.type);

const getNegatedConditionText = (node, context) => {
	const {sourceCode} = context;

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
		&& node.prefix
	) {
		return getParenthesizedText(node.argument, context);
	}

	const conditionText = sourceCode.getText(node);
	return shouldAddParenthesesWhenNegated(node) ? `!(${conditionText})` : `!${conditionText}`;
};

const getBlockBodyText = (blockStatement, ifStatement, sourceCode) => {
	const openingBraceToken = sourceCode.getFirstToken(blockStatement);
	const closingBraceToken = sourceCode.getLastToken(blockStatement);
	const bodyText = sourceCode.text.slice(sourceCode.getRange(openingBraceToken)[1], sourceCode.getRange(closingBraceToken)[0]);

	if (!bodyText.includes('\n')) {
		const trimmedBodyText = bodyText.trim();
		return trimmedBodyText ? `${getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0])}${trimmedBodyText}` : '';
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

	const firstBodyToken = sourceCode.getTokenAfter(openingBraceToken, {includeComments: true});
	const ifIndent = getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0]);
	const bodyIndent = firstBodyToken && firstBodyToken !== closingBraceToken
		? getLineIndent(sourceCode, sourceCode.getRange(firstBodyToken)[0])
		: `${ifIndent}\t`;

	return lines.map(line => {
		if (line.trim() === '') {
			return '';
		}

		return line.startsWith(bodyIndent)
			? `${ifIndent}${line.slice(bodyIndent.length)}`
			: `${ifIndent}${line.trimStart()}`;
	}).join('\n');
};

const getConsequentText = (ifStatement, sourceCode) => {
	const {consequent} = ifStatement;

	if (consequent.type === 'BlockStatement') {
		return getBlockBodyText(consequent, ifStatement, sourceCode);
	}

	return `${getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0])}${sourceCode.getText(consequent).trim()}`;
};

const getReplacementText = (ifStatement, context) => {
	const {sourceCode} = context;
	const ifIndent = getLineIndent(sourceCode, sourceCode.getRange(ifStatement)[0]);
	const conditionText = getNegatedConditionText(ifStatement.test, context);
	const consequentText = getConsequentText(ifStatement, sourceCode);

	return `if (${conditionText}) {\n${ifIndent}\treturn;\n${ifIndent}}\n\n${consequentText}`;
};

const canSafelyMoveConsequent = (ifStatement, sourceCode) => {
	const {consequent} = ifStatement;

	return !hasDirectBlockScopedDeclaration(consequent)
		&& !hasMultilineToken(consequent, sourceCode);
};

const hasCommentsInsideWrapperOutsideConsequent = (ifStatement, sourceCode) => {
	const consequentRange = sourceCode.getRange(ifStatement.consequent);
	return sourceCode.getCommentsInside(ifStatement).some(comment => !isNodeInsideRange(comment, consequentRange, sourceCode));
};

const canSuggestRewrite = (ifStatement, sourceCode) =>
	canSafelyMoveConsequent(ifStatement, sourceCode)
	&& !hasCommentsInsideWrapperOutsideConsequent(ifStatement, sourceCode);

const getFix = (ifStatement, context) => {
	const {sourceCode} = context;
	const {consequent} = ifStatement;

	if (consequent.type !== 'BlockStatement') {
		return;
	}

	if (!canSuggestRewrite(ifStatement, sourceCode)) {
		return;
	}

	if (sourceCode.getCommentsAfter(ifStatement).length > 0) {
		return;
	}

	return fixer => fixer.replaceText(
		ifStatement,
		getReplacementText(ifStatement, context),
	);
};

const getSuggestion = (ifStatement, context) => {
	const {sourceCode} = context;

	if (!canSuggestRewrite(ifStatement, sourceCode)) {
		return;
	}

	return [
		{
			messageId: SUGGESTION_MESSAGE_ID,
			fix: fixer => fixer.replaceText(ifStatement, getReplacementText(ifStatement, context)),
		},
	];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {maximumStatements} = context.options[0];

	context.on(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'], node => {
		if (node.body.type !== 'BlockStatement') {
			return;
		}

		const {body} = node.body;
		if (body.length !== 1) {
			return;
		}

		const [statement] = body;
		if (
			statement.type !== 'IfStatement'
			|| statement.alternate
			|| getConsequentStatementCount(statement) <= maximumStatements
		) {
			return;
		}

		const fix = getFix(statement, context);
		const suggest = fix ? undefined : getSuggestion(statement, context);

		return {
			node: statement,
			messageId: MESSAGE_ID,
			...(fix && {fix}),
			...(suggest && {suggest}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer early returns over full-function conditional wrapping.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{maximumStatements: 1}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
