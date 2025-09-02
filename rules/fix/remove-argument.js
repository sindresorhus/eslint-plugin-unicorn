import {isCommaToken} from '@eslint-community/eslint-utils';
import {getParentheses} from '../utils/parentheses.js';

export default function * removeObjectProperty(fixer, node, context) {
	const {sourceCode} = context;
	for (const token of sourceCode.getTokens(node)) {
		yield fixer.remove(token);
	}

	const parentheses = getParentheses(node, sourceCode);
	for (const token of parentheses) {
		yield fixer.remove(token);
	}

	const firstToken = parentheses[0] ?? node;
	const lastToken = parentheses.at(-1) ?? node;

	const callExpression = node.parent;
	const index = callExpression.arguments.indexOf(node);

	if (index !== 0) {
		const commaToken = sourceCode.getTokenBefore(firstToken);
		yield fixer.remove(commaToken);
	}

	// If the removed argument is the only argument, the trailing comma must be removed too
	/* c8 ignore start */
	if (callExpression.arguments.length === 1) {
		const tokenAfter = sourceCode.getTokenAfter(lastToken);
		if (isCommaToken(tokenAfter)) {
			yield fixer.remove(tokenAfter);
		}
	}
	/* c8 ignore end */
}
