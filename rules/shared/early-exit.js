import {isDirectEvalCall, isFunction} from '../ast/index.js';
import {
	containsNode,
	getIndentUnit,
	getLineIndent,
	getLinebreak,
	getNegatedExpressionText,
	getParenthesizedText,
	getUnwrappedBranchText,
	hasCommentInRange,
	hasMultilineToken,
	isBlockScopedDeclaration,
	wouldRemoveComments,
} from '../utils/index.js';

// Shared logic for `prefer-continue` and `prefer-early-return`, which rewrite an `if` statement wrapping the remainder of a body into an early exit guard.

const lexicalDeclarationKinds = new Set(['const', 'let']);

/**
Get the number of non-empty statements in the consequent of an `if` statement.

@param {import('estree').IfStatement} ifStatement
@returns {number}
*/
export const getConsequentStatementCount = ({consequent}) => {
	if (consequent.type === 'EmptyStatement') {
		return 0;
	}

	return consequent.type === 'BlockStatement'
		? consequent.body.filter(({type}) => type !== 'EmptyStatement').length
		: 1;
};

const isNodeInsideRange = (node, [start, end], context) => {
	const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);
	return nodeStart >= start && nodeEnd <= end;
};

const isUnsupportedBlockScopedDeclaration = node =>
	isBlockScopedDeclaration(node)
	&& !(
		node.type === 'VariableDeclaration'
		&& lexicalDeclarationKinds.has(node.kind)
	);

const hasDirectUnsupportedBlockScopedDeclaration = node =>
	isUnsupportedBlockScopedDeclaration(node)
	|| (
		node.type === 'BlockStatement'
		&& node.body.some(node => isUnsupportedBlockScopedDeclaration(node))
	);

const getNegatedConditionText = (node, context) => {
	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
	) {
		const {sourceCode} = context;
		const [, operatorEnd] = sourceCode.getRange(sourceCode.getFirstToken(node));
		const [argumentStart] = sourceCode.getRange(node.argument);

		if (hasCommentInRange(context, [operatorEnd, argumentStart])) {
			return sourceCode.text.slice(operatorEnd, sourceCode.getRange(node)[1]).trim();
		}

		return getParenthesizedText(node.argument, context);
	}

	return getNegatedExpressionText(node, context);
};

const getConditionRange = (ifStatement, context) => {
	const {sourceCode} = context;
	const openingParenthesisToken = sourceCode.getTokenAfter(sourceCode.getFirstToken(ifStatement));
	const closingParenthesisToken = sourceCode.getTokenBefore(ifStatement.consequent);
	return [
		sourceCode.getRange(openingParenthesisToken)[1],
		sourceCode.getRange(closingParenthesisToken)[0],
	];
};

const getNegatedIfConditionText = (ifStatement, context) => {
	const {sourceCode} = context;
	const conditionRange = getConditionRange(ifStatement, context);

	// Comments in the parentheses around the test
	if (wouldRemoveComments(context, conditionRange, [ifStatement.test])) {
		const conditionText = sourceCode.text.slice(...conditionRange).trimStart();
		return `!(${conditionText})`;
	}

	return getNegatedConditionText(ifStatement.test, context);
};

/**
Get the replacement for an `if` statement wrapping the remainder of a body: a negated guard that exits early, followed by the unwrapped consequent.

@param {import('estree').IfStatement} ifStatement
@param {'continue' | 'return'} exitKeyword
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export const getEarlyExitReplacementText = (ifStatement, exitKeyword, context) => {
	const ifIndent = getLineIndent(ifStatement, context);
	const conditionText = getNegatedIfConditionText(ifStatement, context);
	const consequentText = getUnwrappedBranchText(ifStatement.consequent, context);
	const linebreak = getLinebreak(context);

	return `if (${conditionText}) {${linebreak}${ifIndent}${getIndentUnit(context)}${exitKeyword};${linebreak}${ifIndent}}${linebreak}${linebreak}${consequentText}`;
};

const getDirectLexicalDeclarationVariables = (node, context) => {
	if (node.type !== 'BlockStatement') {
		return [];
	}

	return node.body.flatMap(node => {
		if (
			node.type === 'VariableDeclaration'
			&& lexicalDeclarationKinds.has(node.kind)
		) {
			return context.sourceCode.getDeclaredVariables(node);
		}

		return [];
	});
};

const hasReferenceToVariableName = (node, context, names) => {
	const {sourceCode} = context;
	const [start, end] = sourceCode.getRange(node);
	const hasDefinitionInsideNode = variable => variable.identifiers.some(identifier => isNodeInsideRange(identifier, [start, end], context));
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

// A function body shares its scope with the parameters, so a moved declaration must not redeclare one of them. A loop body has its own scope.
const hasFunctionScopeVariable = (node, context, names) =>
	isFunction(node)
	&& context.sourceCode.scopeManager.acquire(node, true).variables.some(variable => names.has(variable.name));

const canSafelyMoveLexicalDeclarations = (ifStatement, context) => {
	const variables = getDirectLexicalDeclarationVariables(ifStatement.consequent, context);
	if (variables.length === 0) {
		return true;
	}

	if (ifStatement.parent.body.length > 1) {
		return false;
	}

	const names = new Set(variables.map(variable => variable.name));

	return !containsNode(ifStatement.test, context, isDirectEvalCall)
		&& !hasFunctionScopeVariable(ifStatement.parent.parent, context, names)
		&& !hasReferenceToVariableName(ifStatement.test, context, names);
};

const hasMultilineUnbracedConsequent = (ifStatement, context) =>
	ifStatement.consequent.type !== 'BlockStatement'
	&& context.sourceCode.getText(ifStatement.consequent).includes('\n');

// The replacement ends with the body of a braced branch. When that body ends with a line comment, a token after the `if` statement on the same line (like the closing brace of the function in `}}`) would be swallowed by it.
const hasLineCommentBeforeSameLineToken = (ifStatement, context) => {
	const {sourceCode} = context;
	const {consequent} = ifStatement;
	// Only a braced body moves its closing brace away, an unbraced one keeps the source layout
	if (consequent.type !== 'BlockStatement') {
		return false;
	}

	const closingBrace = sourceCode.getLastToken(consequent);
	return sourceCode.getTokenBefore(closingBrace, {includeComments: true}).type === 'Line'
		&& sourceCode.getLoc(sourceCode.getTokenAfter(closingBrace, {includeComments: true})).start.line === sourceCode.getLoc(closingBrace).end.line;
};

/**
Check whether an `if` statement that is the last statement of a function or loop body can be rewritten with `getEarlyExitReplacementText()` without changing behavior or losing comments. Comments after the `if` statement are not checked.

@param {import('estree').IfStatement} ifStatement
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export const canRewriteToEarlyExit = (ifStatement, context) => {
	const {consequent} = ifStatement;

	return !hasDirectUnsupportedBlockScopedDeclaration(consequent)
		&& canSafelyMoveLexicalDeclarations(ifStatement, context)
		&& !hasMultilineToken(consequent, context)
		// Comments inside the `if` statement, outside the condition and the consequent
		&& !wouldRemoveComments(context, ifStatement, [getConditionRange(ifStatement, context), consequent])
		&& !hasMultilineUnbracedConsequent(ifStatement, context)
		&& !hasLineCommentBeforeSameLineToken(ifStatement, context);
};
