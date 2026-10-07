import {
	getCommentSafeProblem,
	getConciseArrowBodyText,
	getFunctionReturnExpression,
	getIndentUnit,
	getLineIndent,
	getLinebreak,
	getParenthesizedRange,
	getParenthesizedText,
	reindentText,
} from './utils/index.js';

const MESSAGE_ID_EXPLICIT = 'useExplicitReturn';
const MESSAGE_ID_IMPLICIT = 'useImplicitReturn';

const messages = {
	[MESSAGE_ID_EXPLICIT]: 'Use an explicit return for a multiline arrow function body.',
	[MESSAGE_ID_IMPLICIT]: 'Use an implicit return for a single-line return expression.',
};

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

const linebreakPattern = /\r\n|[\n\r\u2028\u2029]/;
const isMultiline = text => linebreakPattern.test(text);

const getArrowToken = (node, context) => {
	const bodyRange = getParenthesizedRange(node.body, context);
	return context.sourceCode.getTokenBefore({range: bodyRange});
};

const hasMultilineSignificantWhitespace = (node, sourceCode) =>
	sourceCode.getTokens(node.body).some(token =>
		tokensWithSignificantWhitespace.has(token.type)
		&& sourceCode.getLoc(token).start.line !== sourceCode.getLoc(token).end.line);

const getExplicitReturnFix = (node, context) => {
	const {sourceCode} = context;
	const arrowToken = getArrowToken(node, context);
	const bodyRange = getParenthesizedRange(node.body, context);
	const [, arrowEnd] = sourceCode.getRange(arrowToken);
	const bodyStartToken = sourceCode.getTokenAfter(arrowToken);
	const bodyStartsOnArrowLine = sourceCode.getLoc(bodyStartToken).start.line === sourceCode.getLoc(arrowToken).start.line;
	if (bodyStartsOnArrowLine && hasMultilineSignificantWhitespace(node, sourceCode)) {
		return;
	}

	const linebreak = getLinebreak(context);
	const indentUnit = getIndentUnit(context);
	const indent = getLineIndent(arrowToken, context);
	let bodyText = node.body.type === 'ObjectExpression' ? sourceCode.getText(node.body) : sourceCode.text.slice(...bodyRange);
	if (bodyStartsOnArrowLine) {
		bodyText = reindentText(bodyText, '', indentUnit);
	}

	const replacement = `{${linebreak}${indent}${indentUnit}return ${bodyText};${linebreak}${indent}}`;

	return fixer => fixer.replaceTextRange([arrowEnd, bodyRange[1]], ` ${replacement}`);
};

const getImplicitReturnFix = (node, returnExpression, context) => {
	const {sourceCode} = context;
	const returnArgumentText = getConciseArrowBodyText(returnExpression, context);
	const nextToken = sourceCode.getTokenAfter(node.body);

	if (nextToken && hasPotentiallyUnsafeNextToken(nextToken)) {
		return;
	}

	return fixer => fixer.replaceText(node.body, returnArgumentText);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('ArrowFunctionExpression', node => {
		if (node.body.type === 'BlockStatement') {
			const returnExpression = getFunctionReturnExpression(node);
			if (!returnExpression || isMultiline(getParenthesizedText(returnExpression, context))) {
				return;
			}

			const fix = getImplicitReturnFix(node, returnExpression, context);
			return getCommentSafeProblem(context, {
				node,
				messageId: MESSAGE_ID_IMPLICIT,
				...(fix && {fix}),
			});
		}

		if (!isMultiline(getParenthesizedText(node.body, context))) {
			return;
		}

		const fix = getExplicitReturnFix(node, context);
		return getCommentSafeProblem(context, {
			node,
			messageId: MESSAGE_ID_EXPLICIT,
			...(fix && {fix}),
		});
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
