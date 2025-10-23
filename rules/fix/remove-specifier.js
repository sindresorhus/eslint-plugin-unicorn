import {isCommaToken, isOpeningBraceToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.ImportSpecifier | ESTree.ExportSpecifier | ESTree.ImportDefaultSpecifier | ESTree.ImportNamespaceSpecifier} specifier
@param {ESLint.Rule.RuleFixer} fixer
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {boolean} [keepDeclaration = false]
@returns {ESLint.Rule.ReportFixer}
*/
export default function * removeSpecifier(specifier, fixer, context, keepDeclaration = false) {
	const declaration = specifier.parent;
	const {specifiers} = declaration;

	if (specifiers.length === 1 && !keepDeclaration) {
		yield fixer.remove(declaration);
		return;
	}

	const {sourceCode} = context;
	switch (specifier.type) {
		case 'ImportSpecifier': {
			const isTheOnlyNamedImport = specifiers.every(node => specifier === node || specifier.type !== node.type);
			if (isTheOnlyNamedImport) {
				const fromToken = sourceCode.getTokenAfter(specifier, token => token.type === 'Identifier' && token.value === 'from');

				const hasDefaultImport = specifiers.some(node => node.type === 'ImportDefaultSpecifier');
				const startToken = sourceCode.getTokenBefore(specifier, hasDefaultImport ? isCommaToken : isOpeningBraceToken);
				const [start] = sourceCode.getRange(startToken);
				const [end] = sourceCode.getRange(fromToken);
				const tokenBefore = sourceCode.getTokenBefore(startToken);
				const shouldInsertSpace = sourceCode.getRange(tokenBefore)[1] === start;

				yield fixer.replaceTextRange([start, end], shouldInsertSpace ? ' ' : '');
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
