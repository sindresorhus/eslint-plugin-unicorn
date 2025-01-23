import {removeSpecifier} from './fix/index.js';
import assertToken from './utils/assert-token.js';

const MESSAGE_ID_IMPORT = 'no-named-default/import';
const MESSAGE_ID_EXPORT = 'no-named-default/export';
const messages = {
	[MESSAGE_ID_IMPORT]: 'Prefer using the default import over named import.',
	[MESSAGE_ID_EXPORT]: 'Prefer using the default export over named export.',
};

const isValueImport = node => !node.importKind || node.importKind === 'value';
const isValueExport = node => !node.exportKind || node.exportKind === 'value';

const fixImportSpecifier = (importSpecifier, {sourceCode}) => function * (fixer) {
	const declaration = importSpecifier.parent;

	yield * removeSpecifier(importSpecifier, fixer, sourceCode, /* keepDeclaration */ true);

	const nameText = sourceCode.getText(importSpecifier.local);
	const hasDefaultImport = declaration.specifiers.some(({type}) => type === 'ImportDefaultSpecifier');

	// Insert a new `ImportDeclaration`
	if (hasDefaultImport) {
		const fromToken = sourceCode.getTokenBefore(declaration.source, token => token.type === 'Identifier' && token.value === 'from');
		const text = `import ${nameText} ${sourceCode.text.slice(fromToken.range[0], declaration.range[1])}`;
		yield fixer.insertTextBefore(declaration, `${text}\n`);

		return;
	}

	const importToken = sourceCode.getFirstToken(declaration);
	assertToken(importToken, {
		expected: {type: 'Keyword', value: 'import'},
		ruleId: 'no-named-default',
	});

	const shouldAddComma = declaration.specifiers.some(specifier => specifier !== importSpecifier && specifier.type === importSpecifier.type);
	const tokenAfterImport = sourceCode.getTokenAfter(importToken);
	const trailingSpace = tokenAfterImport.range[0] === importToken.range[1] ? ' ' : '';
	yield fixer.insertTextAfter(importToken, ` ${nameText}${shouldAddComma ? ',' : ''}${trailingSpace}`);
};

const fixExportSpecifier = (exportSpecifier, {sourceCode}) => function * (fixer) {
	const declaration = exportSpecifier.parent;
	yield * removeSpecifier(exportSpecifier, fixer, sourceCode);

	const text = `export default ${sourceCode.getText(exportSpecifier.local)};`;
	yield fixer.insertTextBefore(declaration, `${text}\n`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	ImportSpecifier(specifier) {
		if (!(
			isValueImport(specifier)
			&& specifier.imported.name === 'default'
			&& isValueImport(specifier.parent)
		)) {
			return;
		}

		return {
			node: specifier,
			messageId: MESSAGE_ID_IMPORT,
			fix: fixImportSpecifier(specifier, context),
		};
	},
	ExportSpecifier(specifier) {
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
			messageId: MESSAGE_ID_EXPORT,
			fix: fixExportSpecifier(specifier, context),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow default export as named.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
