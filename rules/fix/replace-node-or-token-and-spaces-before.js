import {getParentheses} from '../utils/parentheses.js';

export default function * replaceNodeOrTokenAndSpacesBefore(nodeOrToken, replacement, fixer, context) {
	const {sourceCode} = context;
	const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore?.() ?? sourceCode;
	const tokens = getParentheses(nodeOrToken, tokenStore);

	for (const token of tokens) {
		yield * replaceNodeOrTokenAndSpacesBefore(token, '', fixer, context);
	}

	let [start, end] = sourceCode.getRange(nodeOrToken);

	const textBefore = sourceCode.text.slice(0, start);
	const [trailingSpaces] = textBefore.match(/\s*$/);
	const [lineBreak] = trailingSpaces.match(/(?:\r?\n|\r){0,1}/);
	start -= trailingSpaces.length;

	yield fixer.replaceTextRange([start, end], `${lineBreak}${replacement}`);
}
