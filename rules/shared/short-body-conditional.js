import {
	getParenthesizedText,
	hasCommentInRange,
	hasDirectBlockScopedDeclaration,
	hasMultilineToken,
	shouldAddParenthesesToUnaryExpressionArgument,
} from '../utils/index.js';

const linebreakPattern = /\r\n|[\n\r\u2028\u2029]/;
const linebreaksPattern = /\r\n|[\n\r\u2028\u2029]/g;
const sourceLinebreaksCache = new WeakMap();

const getStatements = node => node.type === 'BlockStatement' ? node.body : [node];

const isLabeledFunctionDeclaration = node =>
	node.type === 'LabeledStatement'
	&& (
		node.body.type === 'FunctionDeclaration'
		|| isLabeledFunctionDeclaration(node.body)
	);

const getNegatedConditionText = (node, context) => {
	if (node.type === 'UnaryExpression' && node.operator === '!') {
		return getParenthesizedText(node.argument, context);
	}

	const text = context.sourceCode.getText(node);
	return shouldAddParenthesesToUnaryExpressionArgument(node, '!') ? `!(${text})` : `!${text}`;
};

const getLineIndent = (node, context) => {
	const {sourceCode} = context;
	const {line} = sourceCode.getLoc(node).start;
	return /^[\t ]*/.exec(sourceCode.getLines()[line - 1])[0];
};

const appendLinebreaks = (linebreaks, start, end, context) => {
	const {sourceCode} = context;
	for (const match of sourceCode.text.slice(start, end).matchAll(linebreaksPattern)) {
		linebreaks.push({index: start + match.index, value: match[0]});
	}
};

const getSourceLinebreaks = context => {
	const {sourceCode} = context;
	const cachedLinebreaks = sourceLinebreaksCache.get(sourceCode);
	if (cachedLinebreaks) {
		return cachedLinebreaks;
	}

	const linebreaks = [];
	let previousEnd = 0;
	for (const token of sourceCode.getTokens(sourceCode.ast, {includeComments: true})) {
		const [start, end] = sourceCode.getRange(token);
		appendLinebreaks(linebreaks, previousEnd, start, context);
		previousEnd = end;
	}

	appendLinebreaks(linebreaks, previousEnd, sourceCode.text.length, context);
	sourceLinebreaksCache.set(sourceCode, linebreaks);
	return linebreaks;
};

const getLinebreak = (guard, context) => {
	const {sourceCode} = context;
	const [start, end] = sourceCode.getRange(guard.parent);
	const linebreaks = getSourceLinebreaks(context);
	let lowerIndex = 0;
	let upperIndex = linebreaks.length;
	while (lowerIndex < upperIndex) {
		const middleIndex = Math.floor((lowerIndex + upperIndex) / 2);
		if (linebreaks[middleIndex].index < start) {
			lowerIndex = middleIndex + 1;
		} else {
			upperIndex = middleIndex;
		}
	}

	const following = linebreaks[lowerIndex];
	if (following?.index < end) {
		return following.value;
	}

	const previous = linebreaks[lowerIndex - 1];
	if (!previous) {
		return following?.value ?? '\n';
	}

	if (!following) {
		return previous.value;
	}

	const previousDistance = start - previous.index - previous.value.length;
	const followingDistance = following.index - end;
	return followingDistance <= previousDistance ? following.value : previous.value;
};

const getFix = (guard, statements, context) => {
	const {sourceCode} = context;
	const lastStatement = guard.alternate ? guard : statements.at(-1);
	const range = [sourceCode.getRange(guard)[0], sourceCode.getRange(lastStatement)[1]];
	if (
		hasCommentInRange(context, range)
		|| sourceCode.getCommentsAfter(lastStatement).length > 0
	) {
		return;
	}

	// Reserve the enclosing scope so related rules cannot remove the exit first.
	const replace = text => fixer => [
		fixer.insertTextBefore(guard.parent.parent, ''),
		fixer.replaceTextRange(range, text),
	];
	const condition = getNegatedConditionText(guard.test, context);
	if (guard.alternate?.type === 'BlockStatement') {
		return replace(`if (${condition}) ${sourceCode.getText(guard.alternate)}`);
	}

	if (statements.some(statement =>
		(statement.type !== 'BlockStatement' && hasDirectBlockScopedDeclaration(statement))
		|| isLabeledFunctionDeclaration(statement)
		|| hasMultilineToken(statement, context),
	)) {
		return;
	}

	const indent = getLineIndent(guard, context);
	const bodyIndent = getLineIndent(statements[0], context);
	const bodyText = sourceCode.text.slice(sourceCode.getRange(statements[0])[0], sourceCode.getRange(statements.at(-1))[1]);
	const linebreak = getLinebreak(guard, context);
	const linebreaks = bodyText.match(linebreaksPattern) ?? [];
	const lines = bodyText.split(linebreakPattern).map((line, index) => {
		if (!line.trim()) {
			return '';
		}

		const text = index > 0 && line.startsWith(bodyIndent) ? line.slice(bodyIndent.length) : line;
		return `${indent}\t${text}`;
	});
	const indentedBodyText = lines.map((line, index) => `${index === 0 ? '' : linebreaks[index - 1]}${line}`).join('');

	return replace(`if (${condition}) {${linebreak}${indentedBodyText}${linebreak}${indent}}`);
};

/**
Report a whole-body exit guard that can instead wrap a short conditional body.
*/
export default function getShortBodyProblem(block, context, exitStatementType) {
	const {checkShortBodies, maximumStatements} = context.options[0];
	if (!checkShortBodies || maximumStatements === 0) {
		return;
	}

	const [guard] = block.body;
	if (
		guard?.type !== 'IfStatement'
		|| guard.alternate?.type === 'IfStatement'
		|| (guard.alternate && block.body.length !== 1)
	) {
		return;
	}

	const exits = getStatements(guard.consequent);
	if (
		exits.length !== 1
		|| exits[0].type !== exitStatementType
		|| exits[0].argument
		|| exits[0].label
	) {
		return;
	}

	const statements = guard.alternate ? getStatements(guard.alternate) : block.body.slice(1);
	const statementCount = statements.filter(({type}) => type !== 'EmptyStatement').length;
	if (statementCount === 0 || statementCount > maximumStatements) {
		return;
	}

	return {
		node: guard,
		fix: getFix(guard, statements, context),
	};
}
