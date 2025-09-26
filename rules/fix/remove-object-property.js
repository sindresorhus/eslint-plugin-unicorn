import {isCommaToken} from '@eslint-community/eslint-utils';

export default function * removeObjectProperty(fixer, property, context) {
	const {sourceCode} = context;
	for (const token of sourceCode.getTokens(property)) {
		yield fixer.remove(token);
	}

	const tokenAfter = sourceCode.getTokenAfter(property);
	if (isCommaToken(tokenAfter)) {
		yield fixer.remove(tokenAfter);
	} else {
		// If the property is the last one and there is no trailing comma
		// remove the previous comma
		const {properties} = property.parent;
		if (properties.length > 1 && properties.at(-1) === property) {
			const commaTokenBefore = sourceCode.getTokenBefore(property);
			yield fixer.remove(commaTokenBefore);
		}
	}
}
