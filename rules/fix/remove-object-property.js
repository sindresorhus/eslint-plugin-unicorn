import {isCommaToken} from '@eslint-community/eslint-utils';

export default function * removeObjectProperty(fixer, property, context) {
	const {sourceCode} = context;
	for (const token of sourceCode.getTokens(property)) {
		yield fixer.remove(token);
	}

	const tokenAfter = sourceCode.getTokenAfter(property);
	if (isCommaToken(tokenAfter)) {
		yield fixer.remove(tokenAfter);
	}
}
