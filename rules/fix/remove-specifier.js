import {isCommaToken, isOpeningBraceToken} from '@eslint-community/eslint-utils';

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
				const fromToken = sourceCode.getTokenAfter(specifier, token => token.type === 'Identifier' && token.value === 'from');

				const hasDefaultImport = specifiers.some(node => node.type === 'ImportDefaultSpecifier');
				const startToken = sourceCode.getTokenBefore(specifier, hasDefaultImport ? isCommaToken : isOpeningBraceToken)
				const tokenBefore = sourceCode.getTokenBefore(startToken);

				yield fixer.replaceTextRange(
					[startToken.range[0], fromToken.range[0]],
					tokenBefore.range[1] === startToken.range[0] ? ' ' : '',
				);
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
