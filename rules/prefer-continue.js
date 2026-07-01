import {isCallExpression, loopTypes} from './ast/index.js';
import {
	getParenthesizedText,
	hasMultilineToken,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-continue';
const messages = {
	[MESSAGE_ID]: 'Prefer an early continue over wrapping the whole loop body in an `if` statement.',
};

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
				description: 'Maximum number of statements allowed in a whole-loop conditional wrapper.',
			},
		},
	},
];

const loopExitStatementTypes = new Set([
	'ReturnStatement',
	'BreakStatement',
	'ContinueStatement',
	'ThrowStatement',
]);

const getNonEmptyBlockStatements = blockStatement => blockStatement.body.filter(({type}) => type !== 'EmptyStatement');

// The continue-guard rewrite is pointless when the `if` body unconditionally exits the iteration, so there is no remaining loop body to flatten.
const consequentExitsLoop = consequent => {
	const lastStatement = consequent.type === 'BlockStatement'
		? getNonEmptyBlockStatements(consequent).at(-1)
		: consequent;
	return loopExitStatementTypes.has(lastStatement?.type);
};

const getConsequentStatementCount = node => {
	if (node.consequent.type === 'EmptyStatement') {
		return 0;
	}

	return node.consequent.type === 'BlockStatement'
		? getNonEmptyBlockStatements(node.consequent).length
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
	return shouldAddParenthesesToUnaryExpressionArgument(node, '!') ? `!(${conditionText})` : `!${conditionText}`;
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

	return `if (${conditionText}) {\n${ifIndent}\tcontinue;\n${ifIndent}}\n\n${consequentText}`;
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

const canSafelyMoveLexicalDeclarations = (ifStatement, sourceCode) => {
	const variables = getDirectLexicalDeclarationVariables(ifStatement.consequent, sourceCode);
	if (variables.length === 0) {
		return true;
	}

	const names = new Set(variables.map(variable => variable.name));

	return !hasDirectEvalCall(ifStatement.test, sourceCode)
		&& !hasReferenceToVariableName(ifStatement.test, sourceCode, names);
};

const canSafelyMoveConsequent = (ifStatement, context) => {
	const {sourceCode} = context;
	const {consequent} = ifStatement;

	return !hasDirectUnsupportedBlockScopedDeclaration(consequent)
		&& canSafelyMoveLexicalDeclarations(ifStatement, sourceCode)
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

const canRewrite = (ifStatement, context) => {
	const {sourceCode} = context;
	return canSafelyMoveConsequent(ifStatement, context)
		&& !hasCommentsInsideWrapperOutsideConditionOrConsequent(ifStatement, sourceCode)
		&& !hasMultilineUnbracedConsequent(ifStatement, sourceCode)
		&& sourceCode.getCommentsAfter(ifStatement).length === 0;
};

const getFix = (ifStatement, context) => {
	if (!canRewrite(ifStatement, context)) {
		return;
	}

	return fixer => fixer.replaceText(
		ifStatement,
		getReplacementText(ifStatement, context),
	);
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {maximumStatements} = context.options[0];

	context.on(loopTypes, loop => {
		if (
			loop.body.type !== 'BlockStatement'
			|| loop.body.body.length !== 1
		) {
			return;
		}

		const [statement] = loop.body.body;
		if (
			statement.type !== 'IfStatement'
			|| statement.alternate
			|| getConsequentStatementCount(statement) <= maximumStatements
			|| consequentExitsLoop(statement.consequent)
		) {
			return;
		}

		const fix = getFix(statement, context);

		return {
			node: statement,
			messageId: MESSAGE_ID,
			...(fix && {fix}),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer early continues over whole-loop conditional wrapping.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{maximumStatements: 1}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
