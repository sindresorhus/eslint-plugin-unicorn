import {isCommaToken, isClosingBraceToken, isOpeningBraceToken} from '@eslint-community/eslint-utils';

export default function * removeSpecifier(specifier, fixer, sourceCode, keepDeclaration = false) {
	const declaration = specifier.parent;
	const {specifiers} = declaration;

	if (specifiers.length === 1 && !keepDeclaration) {
		yield fixer.remove(declaration);
		return;
	}

	switch (specifier.type) {
		case 'ImportSpecifier': {
			const isTheOnlyNamedImport = specifiers.every(node => specifier === node || specifier.type !== node.type);
			if (isTheOnlyNamedImport) {
				const closingBraceToken = sourceCode.getTokenAfter(specifier, isClosingBraceToken);

				const hasDefaultImport = specifiers.some(node => node.type === 'ImportDefaultSpecifier');
				const startToken = hasDefaultImport
					? sourceCode.getTokenBefore(specifier, isCommaToken)
					: sourceCode.getTokenBefore(specifier, isOpeningBraceToken);

				yield fixer.replaceTextRange([startToken.range[0], closingBraceToken.range[1]], '');
				return;
			}
			// Fallthrough
		}

		case 'ExportSpecifier':
		case 'ImportNamespaceSpecifier':
		case 'ImportDefaultSpecifier': {
			yield fixer.remove(specifier);

			const tokenAfter = sourceCode.getTokenAfter(specifier);
			if (isCommaToken(tokenAfter)) {
				yield fixer.remove(tokenAfter);
			}

			break;
		}

		// No default
	}
}
