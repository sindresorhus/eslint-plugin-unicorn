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

const isExitGuard = (node, exitStatementType) => {
	if (
		node?.type !== 'IfStatement'
		|| node.alternate?.type === 'IfStatement'
	) {
		return false;
	}

	const exits = getStatements(node.consequent);
	return exits.length === 1
		&& exits[0].type === exitStatementType
		&& !exits[0].argument
		&& !exits[0].label;
};

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

	const guardIndex = block.body.findLastIndex(node => isExitGuard(node, exitStatementType));
	if (guardIndex === -1) {
		return;
	}

	const guard = block.body[guardIndex];
	const previousStatement = block.body.slice(0, guardIndex).findLast(({type}) => type !== 'EmptyStatement');
	if (
		(guard.alternate && guardIndex !== block.body.length - 1)
		// Keep guard chains, since wrapping the last guard makes the previous one wrap it too.
		|| isExitGuard(previousStatement, exitStatementType)
	) {
		return;
	}

	const statements = guard.alternate ? getStatements(guard.alternate) : block.body.slice(guardIndex + 1);
	const statementCount = statements.filter(({type}) => type !== 'EmptyStatement').length;
	if (statementCount === 0 || statementCount > maximumStatements) {
		return;
	}

	return {
		node: guard,
		fix: getFix(guard, statements, context),
	};
}
