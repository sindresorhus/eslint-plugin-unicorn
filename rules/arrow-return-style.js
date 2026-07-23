import {
	getParenthesizedRange,
	getParenthesizedText,
	isParenthesized,
} from './utils/index.js';

const MESSAGE_ID_EXPLICIT = 'useExplicitReturn';
const MESSAGE_ID_IMPLICIT = 'useImplicitReturn';

const messages = {
	[MESSAGE_ID_EXPLICIT]: 'Use an explicit return for a multiline arrow function body.',
	[MESSAGE_ID_IMPLICIT]: 'Use an implicit return for a single-line arrow function body.',
};

const returnArgumentTypesRequiringParentheses = new Set([
	'ObjectExpression',
	'SequenceExpression',
]);

const typeScriptExpressionWrappers = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
]);

const tokensWithSignificantWhitespace = new Set([
	'String',
	'Template',
	'JSXText',
]);

const tokensThatMayContinueAnExpression = new Set([
	'[',
	'(',
	'/',
	'`',
	'+',
	'-',
	'*',
	'.',
	'<',
]);

const hasPotentiallyUnsafeNextToken = token =>
	tokensThatMayContinueAnExpression.has(token.value)
	|| token.type === 'RegularExpression'
	|| token.type === 'Template';

const isMultiline = text => text.includes('\n');

const getReturnStatement = node => {
	if (node.body.body.length !== 1 || node.body.body[0].type !== 'ReturnStatement') {
		return;
	}

	const returnStatement = node.body.body[0];
	if (!returnStatement.argument) {
		return;
	}

	return returnStatement;
};

const hasComments = (node, sourceCode) => sourceCode.getCommentsInside(node).length > 0;

const getLineIndent = (sourceCode, node) => {
	const [start] = sourceCode.getRange(node);
	const lineStart = sourceCode.text.lastIndexOf('\n', start - 1) + 1;

	return /^[\t ]*/.exec(sourceCode.text.slice(lineStart, start))[0];
};

const getArrowToken = (node, context) => {
	const bodyRange = getParenthesizedRange(node.body, context);
	return context.sourceCode.getTokenBefore({range: bodyRange});
};

const getUnderlyingExpression = node => {
	while (typeScriptExpressionWrappers.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const getReturnArgumentText = (returnArgument, context) => {
	const text = getParenthesizedText(returnArgument, context);

	if (isParenthesized(returnArgument, context) || !returnArgumentTypesRequiringParentheses.has(getUnderlyingExpression(returnArgument).type)) {
		return text;
	}

	return `(${text})`;
};

const hasMultilineSignificantWhitespace = (node, sourceCode) =>
	sourceCode.getTokens(node.body).some(token =>
		tokensWithSignificantWhitespace.has(token.type)
		&& sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line);

const getBodyText = (text, shouldIndent) => {
	if (!shouldIndent) {
		return text;
	}

	const lines = text.split('\n');
	for (const [index, line] of lines.entries()) {
		if (index > 0 && line) {
			lines[index] = `\t${line}`;
		}
	}

	return lines.join('\n');
};

const getExplicitReturnFix = (node, context) => {
	const {sourceCode} = context;
	const arrowToken = getArrowToken(node, context);
	const bodyRange = getParenthesizedRange(node.body, context);
	const bodyStartToken = sourceCode.getTokenAfter(arrowToken);
	const bodyStartsOnArrowLine = sourceCode.getLoc(bodyStartToken).start.line === sourceCode.getLoc(arrowToken).start.line;
	if (bodyStartsOnArrowLine && hasMultilineSignificantWhitespace(node, sourceCode)) {
		return;
	}

	const bodyText = getBodyText(sourceCode.text.slice(...bodyRange), bodyStartsOnArrowLine);
	const indentation = getLineIndent(sourceCode, arrowToken);
	const replacement = `{\n${indentation}\treturn ${bodyText};\n${indentation}}`;

	return fixer => fixer.replaceTextRange([sourceCode.getRange(arrowToken)[1], bodyRange[1]], ` ${replacement}`);
};

const getImplicitReturnFix = (node, returnStatement, context) => {
	const {sourceCode} = context;
	const returnArgumentText = getReturnArgumentText(returnStatement.argument, context);
	const nextToken = sourceCode.getTokenAfter(node.body);

	if (nextToken && hasPotentiallyUnsafeNextToken(nextToken)) {
		return;
	}

	return fixer => fixer.replaceText(node.body, returnArgumentText);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ArrowFunctionExpression', node => {
		if (hasComments(node, sourceCode)) {
			return;
		}

		if (node.body.type === 'BlockStatement') {
			const returnStatement = getReturnStatement(node);
			if (!returnStatement || isMultiline(getParenthesizedText(returnStatement.argument, context))) {
				return;
			}

			const fix = getImplicitReturnFix(node, returnStatement, context);
			return {
				node,
				messageId: MESSAGE_ID_IMPLICIT,
				...(fix && {fix}),
			};
		}

		if (!isMultiline(getParenthesizedText(node.body, context))) {
			return;
		}

		const fix = getExplicitReturnFix(node, context);
		return {
			node,
			messageId: MESSAGE_ID_EXPLICIT,
			...(fix && {fix}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a consistent return style for multiline arrow function bodies.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
