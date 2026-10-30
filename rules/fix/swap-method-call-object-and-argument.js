import {isParenthesized} from '@eslint-community/eslint-utils';
import {canTokensBeAdjacent, needsSemicolon, shouldAddParenthesesToMemberExpressionObject} from '../utils/index.js';
import fixSpaceAroundKeyword from './fix-space-around-keywords.js';

/**
Swap a method call's receiver and its only argument, preserving the parentheses and spacing required at their new positions.

@param {import('eslint').Rule.RuleFixer} fixer
@param {import('estree').CallExpression} node
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} [replacementNode=node.callee.object] - The position used to determine whether the new receiver needs parentheses.
*/
export default function * swapMethodCallObjectAndArgument(fixer, node, context, replacementNode = node.callee.object) {
	const {sourceCode} = context;
	const objectNode = node.callee.object;
	const [argumentNode] = node.arguments;

	let objectText = sourceCode.getText(objectNode);
	if (
		!isParenthesized(argumentNode, sourceCode)
		// Only `SequenceExpression` needs parentheses.
		&& objectNode.type === 'SequenceExpression'
	) {
		objectText = `(${objectText})`;
	}

	yield fixer.replaceText(argumentNode, objectText);

	let argumentText = sourceCode.getText(argumentNode);
	if (
		!isParenthesized(objectNode, sourceCode)
		&& shouldAddParenthesesToMemberExpressionObject(argumentNode, context, replacementNode)
	) {
		argumentText = `(${argumentText})`;
	}

	// A replacement starting with `/` can continue the previous expression when the receiver begins a line, so a semicolon may have to go in front of it.
	const tokenBefore = sourceCode.getTokenBefore(objectNode);
	if (needsSemicolon(tokenBefore, context, argumentText)) {
		yield fixer.insertTextBefore(objectNode, ';');
	}

	// Keep an adjacent operator and the new receiver from becoming a comment.
	if (
		tokenBefore?.type === 'Punctuator'
		&& sourceCode.getRange(tokenBefore)[1] === sourceCode.getRange(objectNode)[0]
		&& !canTokensBeAdjacent(tokenBefore, argumentText)
	) {
		argumentText = ` ${argumentText}`;
	}

	yield fixer.replaceText(objectNode, argumentText);
	yield fixSpaceAroundKeyword(fixer, objectNode, context);
}
