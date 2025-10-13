import {isCommaToken} from '@eslint-community/eslint-utils';
import {getParentheses} from '../utils/parentheses.js';

export default function removeArgument(fixer, node, sourceCode) {
	const callExpression = node.parent;
	const index = callExpression.arguments.indexOf(node);
	const parentheses = getParentheses(node, sourceCode);
	const firstToken = parentheses[0] || node;
	const lastToken = parentheses.at(-1) || node;

	let [start] = sourceCode.getRange(firstToken);
	let [, end] = sourceCode.getRange(lastToken);

	if (index !== 0) {
		const commaToken = sourceCode.getTokenBefore(firstToken);
		[start] = sourceCode.getRange(commaToken);
	}

	// If the removed argument is the only argument, the trailing comma must be removed too
	if (callExpression.arguments.length === 1) {
		const tokenAfter = sourceCode.getTokenAfter(lastToken);
		if (isCommaToken(tokenAfter)) {
			[, end] = sourceCode.getRange(tokenAfter);
		}
	}

	return fixer.removeRange([start, end]);
}
