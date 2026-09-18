import {
	getIndentUnit,
	getLineIndent,
	getLinebreak,
	getParenthesizedText,
	hasCommentInRange,
	hasMultilineToken,
	isBlockScopedDeclaration,
	reindentText,
	shouldAddParenthesesToUnaryExpressionArgument,
} from '../utils/index.js';

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
		isBlockScopedDeclaration(statement)
		|| isLabeledFunctionDeclaration(statement)
		|| hasMultilineToken(statement, context),
	)) {
		return;
	}

	const indent = getLineIndent(guard, context);
	const bodyIndent = `${indent}${getIndentUnit(context)}`;
	const [bodyStart] = sourceCode.getRange(statements[0]);
	const [, bodyEnd] = sourceCode.getRange(statements.at(-1));
	const bodyText = reindentText(sourceCode.text.slice(bodyStart, bodyEnd), getLineIndent(statements[0], context), bodyIndent);
	const linebreak = getLinebreak(context);
	return replace(`if (${condition}) {${linebreak}${bodyIndent}${bodyText}${linebreak}${indent}}`);
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
