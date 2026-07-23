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
	'**',
	'.',
	'<',
]);

const hasPotentiallyUnsafeNextToken = token =>
	tokensThatMayContinueAnExpression.has(token.value)
	|| token.type === 'RegularExpression'
	|| token.type === 'Template';

const linebreakPattern = /\r\n|[\n\r]/;
const isMultiline = text => linebreakPattern.test(text);

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

const hasCommentsInside = (node, sourceCode) => sourceCode.getCommentsInside(node).length > 0;

const getLineIndent = (sourceCode, node) => {
	const [start] = sourceCode.getRange(node);
	const {line, column} = sourceCode.getLocFromIndex(start);

	return /^[\t ]*/.exec(sourceCode.lines[line - 1].slice(0, column))[0];
};

const getArrowToken = (node, context) => {
	const bodyRange = getParenthesizedRange(node.body, context);
	return context.sourceCode.getTokenBefore({range: bodyRange});
};

const getUnderlyingExpression = node => {
	while (typeScriptExpressionWrappers.has(node.type)) {
		const {expression} = node;
		node = expression;
	}

	return node;
};

const isInsideForStatementInitializer = node => {
	let current = node;
	while (current.parent) {
		const {parent} = current;
		if (parent.type === 'ForStatement' && parent.init === current) {
			return true;
		}

		current = parent;
	}

	return false;
};

const getReturnArgumentText = (returnArgument, context) => {
	const text = getParenthesizedText(returnArgument, context);
	const underlyingExpression = getUnderlyingExpression(returnArgument);
	const needsParentheses = returnArgumentTypesRequiringParentheses.has(underlyingExpression.type)
		|| (
			underlyingExpression.type === 'BinaryExpression'
			&& underlyingExpression.operator === 'in'
			&& isInsideForStatementInitializer(returnArgument)
		);

	if (isParenthesized(returnArgument, context) || !needsParentheses) {
		return text;
	}

	return `(${text})`;
};

const hasMultilineSignificantWhitespace = (node, sourceCode) =>
	sourceCode.getTokens(node.body).some(token =>
		tokensWithSignificantWhitespace.has(token.type)
		&& sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line);

const getBodyText = (text, shouldIndent, linebreak) => {
	if (!shouldIndent) {
		return text;
	}

	const lines = text.split(linebreakPattern);
	for (const [index, line] of lines.entries()) {
		if (index > 0 && line) {
			lines[index] = `\t${line}`;
		}
	}

	return lines.join(linebreak);
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

	const linebreak = sourceCode.text.match(linebreakPattern)?.[0] ?? '\n';
	const bodyText = getBodyText(
		node.body.type === 'ObjectExpression' ? sourceCode.getText(node.body) : sourceCode.text.slice(...bodyRange),
		bodyStartsOnArrowLine,
		linebreak,
	);
	const indentation = getLineIndent(sourceCode, arrowToken);
	const replacement = `{${linebreak}${indentation}\treturn ${bodyText};${linebreak}${indentation}}`;

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
		if (hasCommentsInside(node, sourceCode)) {
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
