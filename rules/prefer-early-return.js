import {
	getParenthesizedText,
	hasMultilineToken,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';
import {isCallExpression} from './ast/index.js';

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

const lexicalDeclarationKinds = new Set(['const', 'let']);

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

	return node.consequent.type === 'BlockStatement'
		? node.consequent.body.filter(({type}) => type !== 'EmptyStatement').length
		: 1;
};

const getLineIndent = (sourceCode, index) => {
	const lineStart = sourceCode.text.lastIndexOf('\n', index - 1) + 1;
	return /^[\t ]*/.exec(sourceCode.text.slice(lineStart, index))[0];
};

const isNodeInsideRange = (node, [start, end], sourceCode) => {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	return nodeStart >= start && nodeEnd <= end;
};

const isUnsupportedBlockScopedDeclaration = node =>
	(
		node.type === 'VariableDeclaration'
		&& node.kind !== 'var'
		&& !lexicalDeclarationKinds.has(node.kind)
	)
	|| blockScopedDeclarationTypes.has(node.type);

const hasDirectUnsupportedBlockScopedDeclaration = node =>
	isUnsupportedBlockScopedDeclaration(node)
	|| (
		node.type === 'BlockStatement'
		&& node.body.some(node => isUnsupportedBlockScopedDeclaration(node))
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
		const operatorToken = sourceCode.getFirstToken(node);
		const operatorRange = sourceCode.getRange(operatorToken);
		const nodeRange = sourceCode.getRange(node);
		const argumentRange = sourceCode.getRange(node.argument);
		const hasCommentBetweenOperatorAndArgument = sourceCode.getCommentsInside(node).some(comment =>
			sourceCode.getRange(comment)[0] >= operatorRange[1]
			&& sourceCode.getRange(comment)[1] <= argumentRange[0],
		);

		if (hasCommentBetweenOperatorAndArgument) {
			return sourceCode.text.slice(operatorRange[1], nodeRange[1]).trim();
		}

		return getParenthesizedText(node.argument, context);
	}

	const conditionText = sourceCode.getText(node);
	return shouldAddParenthesesWhenNegated(node) ? `!(${conditionText})` : `!${conditionText}`;
};

const getConditionRange = (ifStatement, sourceCode) => {
	const openingParenthesisToken = sourceCode.getTokenAfter(sourceCode.getFirstToken(ifStatement));
	const closingParenthesisToken = sourceCode.getTokenBefore(ifStatement.consequent);
	return [
		sourceCode.getRange(openingParenthesisToken)[1],
		sourceCode.getRange(closingParenthesisToken)[0],
	];
};

const hasConditionParenthesesComment = (ifStatement, sourceCode) => {
	const conditionRange = getConditionRange(ifStatement, sourceCode);
	const testRange = sourceCode.getRange(ifStatement.test);
	return sourceCode.getCommentsInside(ifStatement).some(comment =>
		isNodeInsideRange(comment, conditionRange, sourceCode)
		&& !isNodeInsideRange(comment, testRange, sourceCode),
	);
};

const getNegatedIfConditionText = (ifStatement, context) => {
	const {sourceCode} = context;

	if (hasConditionParenthesesComment(ifStatement, sourceCode)) {
		const conditionText = sourceCode.text.slice(...getConditionRange(ifStatement, sourceCode)).trimStart();
		return `!(${conditionText})`;
	}

	return getNegatedConditionText(ifStatement.test, context);
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
	const conditionText = getNegatedIfConditionText(ifStatement, context);
	const consequentText = getConsequentText(ifStatement, sourceCode);

	return `if (${conditionText}) {\n${ifIndent}\treturn;\n${ifIndent}}\n\n${consequentText}`;
};

const getDirectLexicalDeclarationVariables = (node, sourceCode) => {
	if (node.type !== 'BlockStatement') {
		return [];
	}

	return node.body.flatMap(node => {
		if (
			node.type === 'VariableDeclaration'
			&& lexicalDeclarationKinds.has(node.kind)
		) {
			return sourceCode.getDeclaredVariables(node);
		}

		return [];
	});
};

const hasReferenceToVariableName = (node, sourceCode, names) => {
	const [start, end] = sourceCode.getRange(node);
	const hasDefinitionInsideNode = variable => variable.identifiers.some(identifier => isNodeInsideRange(identifier, [start, end], sourceCode));
	const hasReference = scope => scope.references.some(reference => {
		const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
		return referenceStart >= start
			&& referenceEnd <= end
			&& names.has(reference.identifier.name)
			&& !(
				reference.resolved
				&& hasDefinitionInsideNode(reference.resolved)
			);
	}) || scope.childScopes.some(scope => hasReference(scope));

	return hasReference(sourceCode.getScope(node));
};

const hasDirectEvalCall = (node, sourceCode) => {
	if (isCallExpression(node, {name: 'eval', optional: false})) {
		return true;
	}

	for (const key of sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const element of value) {
				if (
					element
					&& hasDirectEvalCall(element, sourceCode)
				) {
					return true;
				}
			}

			continue;
		}

		if (
			value
			&& hasDirectEvalCall(value, sourceCode)
		) {
			return true;
		}
	}

	return false;
};

const hasFunctionScopeVariable = (functionNode, sourceCode, names) =>
	sourceCode.scopeManager.acquire(functionNode, true).variables.some(variable => names.has(variable.name));

const canSafelyMoveLexicalDeclarations = (ifStatement, functionNode, sourceCode) => {
	const variables = getDirectLexicalDeclarationVariables(ifStatement.consequent, sourceCode);
	if (variables.length === 0) {
		return true;
	}

	const names = new Set(variables.map(variable => variable.name));

	return !hasDirectEvalCall(ifStatement.test, sourceCode)
		&& !hasFunctionScopeVariable(functionNode, sourceCode, names)
		&& !hasReferenceToVariableName(ifStatement.test, sourceCode, names);
};

const canSafelyMoveConsequent = (ifStatement, functionNode, context) => {
	const {sourceCode} = context;
	const {consequent} = ifStatement;

	return !hasDirectUnsupportedBlockScopedDeclaration(consequent)
		&& canSafelyMoveLexicalDeclarations(ifStatement, functionNode, sourceCode)
		&& !hasMultilineToken(consequent, context);
};

const hasCommentsInsideWrapperOutsideConditionOrConsequent = (ifStatement, sourceCode) => {
	const conditionRange = getConditionRange(ifStatement, sourceCode);
	const consequentRange = sourceCode.getRange(ifStatement.consequent);
	return sourceCode.getCommentsInside(ifStatement).some(comment =>
		!isNodeInsideRange(comment, conditionRange, sourceCode)
		&& !isNodeInsideRange(comment, consequentRange, sourceCode),
	);
};

const hasMultilineUnbracedConsequent = (ifStatement, sourceCode) =>
	ifStatement.consequent.type !== 'BlockStatement'
	&& sourceCode.getText(ifStatement.consequent).includes('\n');

const canSuggestRewrite = (ifStatement, functionNode, context) => {
	const {sourceCode} = context;
	return canSafelyMoveConsequent(ifStatement, functionNode, context)
		&& !hasCommentsInsideWrapperOutsideConditionOrConsequent(ifStatement, sourceCode)
		&& !hasMultilineUnbracedConsequent(ifStatement, sourceCode);
};

const getFix = (ifStatement, functionNode, context) => {
	const {sourceCode} = context;

	if (!canSuggestRewrite(ifStatement, functionNode, context)) {
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

const getSuggestion = (ifStatement, functionNode, context) => {
	if (!canSuggestRewrite(ifStatement, functionNode, context)) {
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

		const fix = getFix(statement, node, context);
		const suggest = fix ? undefined : getSuggestion(statement, node, context);

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
