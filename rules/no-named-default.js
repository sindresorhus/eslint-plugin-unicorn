import {isCommaToken, isOpeningBraceToken} from '@eslint-community/eslint-utils';
import {removeSpecifier} from './fix/index.js';
import assertToken from './utils/assert-token.js';

const MESSAGE_ID = 'no-named-default';
const messages = {
	[MESSAGE_ID]: 'Prefer using the default {{type}} over named {{type}}.',
};

const isValueImport = node => !node.importKind || node.importKind === 'value';
const isValueExport = node => !node.exportKind || node.exportKind === 'value';

// The autofix discards everything it removes, so it can only run when no comment sits in that range.
const hasCommentInImportRemovalRange = (specifier, sourceCode) => {
	const declaration = specifier.parent;
	const isTheOnlyNamedImport = declaration.specifiers.every(node => node === specifier || node.type !== specifier.type);

	// With other named imports present, only the specifier itself is removed.
	if (!isTheOnlyNamedImport) {
		return sourceCode.getCommentsInside(specifier).length > 0;
	}

	// Otherwise everything from the `{` (or the `,` before it when there's a default import) up to `from` is removed.
	const hasDefaultImport = declaration.specifiers.some(node => node.type === 'ImportDefaultSpecifier');
	const startToken = sourceCode.getTokenBefore(specifier, hasDefaultImport ? isCommaToken : isOpeningBraceToken);
	const fromToken = sourceCode.getTokenAfter(specifier, token => token.type === 'Identifier' && token.value === 'from');
	return sourceCode.commentsExistBetween(startToken, fromToken);
};

const hasCommentInExportRemovalRange = (specifier, sourceCode) => {
	const declaration = specifier.parent;
	// A lone specifier removes the whole declaration; otherwise only the specifier is removed.
	const removalNode = declaration.specifiers.length === 1 ? declaration : specifier;
	return sourceCode.getCommentsInside(removalNode).length > 0;
};

const fixImportSpecifier = (importSpecifier, context) => function * (fixer) {
	const {sourceCode} = context;
	const declaration = importSpecifier.parent;

	yield removeSpecifier(importSpecifier, fixer, context, /* keepDeclaration */ true);

	const nameText = sourceCode.getText(importSpecifier.local);
	const hasDefaultImport = declaration.specifiers.some(({type}) => type === 'ImportDefaultSpecifier');

	// Insert a new `ImportDeclaration`
	if (hasDefaultImport) {
		const fromToken = sourceCode.getTokenBefore(declaration.source, token => token.type === 'Identifier' && token.value === 'from');
		const [startOfFromToken] = sourceCode.getRange(fromToken);
		const [, endOfDeclaration] = sourceCode.getRange(declaration);
		const text = `import ${nameText} ${sourceCode.text.slice(startOfFromToken, endOfDeclaration)}`;
		yield fixer.insertTextBefore(declaration, `${text}\n`);

		return;
	}

	const importToken = sourceCode.getFirstToken(declaration);
	assertToken(importToken, {
		expected: {type: 'Keyword', value: 'import'},
		ruleId: 'no-named-default',
	});

	const shouldAddComma = declaration.specifiers.some(specifier => specifier !== importSpecifier && specifier.type === importSpecifier.type);
	yield fixer.insertTextAfter(importToken, ` ${nameText}${shouldAddComma ? ',' : ''}`);
};

const fixExportSpecifier = (exportSpecifier, context) => function * (fixer) {
	const declaration = exportSpecifier.parent;
	yield removeSpecifier(exportSpecifier, fixer, context);

	const text = `export default ${context.sourceCode.getText(exportSpecifier.local)};`;
	yield fixer.insertTextBefore(declaration, `${text}\n`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ImportSpecifier', specifier => {
		if (!(
			isValueImport(specifier)
			&& specifier.imported.name === 'default'
			&& isValueImport(specifier.parent)
		)) {
			return;
		}

		return {
			node: specifier,
			messageId: MESSAGE_ID,
			data: {type: 'import'},
			// Skip the autofix when it would drop a comment.
			fix: hasCommentInImportRemovalRange(specifier, sourceCode)
				? undefined
				: fixImportSpecifier(specifier, context),
		};
	});

	context.on('ExportSpecifier', specifier => {
		if (!(
			isValueExport(specifier)
			&& specifier.exported.name === 'default'
			&& isValueExport(specifier.parent)
			&& !specifier.parent.source
		)) {
			return;
		}

		return {
			node: specifier,
			messageId: MESSAGE_ID,
			data: {type: 'export'},
			// Skip the autofix when it would drop a comment.
			fix: hasCommentInExportRemovalRange(specifier, sourceCode)
				? undefined
				: fixExportSpecifier(specifier, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow named usage of default import and export.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
