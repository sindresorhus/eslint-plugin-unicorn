import {getParentheses} from '../utils/parentheses.js';

export default function * removeParentheses(node, fixer, sourceCode) {
	const parentheses = getParentheses(node, context);
	for (const token of parentheses) {
		yield fixer.remove(token);
	}
}
