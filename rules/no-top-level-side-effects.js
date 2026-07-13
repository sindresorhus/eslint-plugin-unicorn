import {hasSideEffect} from '@eslint-community/eslint-utils';
import {unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in exported modules.',
};

const exportDeclarationTypes = new Set([
	'ExportAllDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
]);

// Type-only exports (`export type`, `export interface`, `export declare`, `export {type Foo}`, …) are erased when TypeScript is compiled to JavaScript, so a file whose only exports are type-only has no runtime exports.
const isTypeOnlyExport = node =>
	node.exportKind === 'type'
	|| node.declaration?.type === 'TSInterfaceDeclaration'
	// `export {type Foo}` keeps `exportKind: 'value'` on the declaration, but every specifier is type-only, so it is fully erased. `export {}` (no specifiers) is a runtime module marker and is not type-only.
	|| (node.specifiers?.length > 0 && node.specifiers.every(specifier => specifier.exportKind === 'type'));

const isExportDeclaration = node => exportDeclarationTypes.has(node.type) && !isTypeOnlyExport(node);

const isAllowedAssignment = node => unwrapTypeScriptExpression(node).type === 'AssignmentExpression';

const isScriptSetupElement = node =>
	node.type === 'VElement'
	&& node.name === 'script'
	&& node.startTag.attributes.some(attribute =>
		!attribute.directive
		&& attribute.key.name === 'setup',
	);

const getScriptSetupRange = sourceCode => {
	const documentFragment = sourceCode.parserServices?.getDocumentFragment?.();
	return documentFragment?.children.find(node => isScriptSetupElement(node))?.range;
};

const isInScriptSetup = (node, scriptSetupRange, sourceCode) => {
	if (!scriptSetupRange) {
		return false;
	}

	const nodeRange = sourceCode.getRange(node);
	return scriptSetupRange[0] <= nodeRange[0] && nodeRange[1] <= scriptSetupRange[1];
};

const hasTopLevelSideEffect = (node, sourceCode) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'ClassExpression') {
		return node.superClass ? hasTopLevelSideEffect(node.superClass, sourceCode) : false;
	}

	return node.type === 'TaggedTemplateExpression'
		|| hasSideEffect(node, sourceCode);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const scriptSetupRange = getScriptSetupRange(sourceCode);
	let shouldCheck = false;

	context.on('Program', program => {
		shouldCheck = !sourceCode.lines[0].startsWith('#!')
			&& program.body.some(node => isExportDeclaration(node));
	});

	context.on('ExpressionStatement', node => {
		if (
			!shouldCheck
			|| node.parent.type !== 'Program'
			|| isInScriptSetup(node, scriptSetupRange, sourceCode)
			|| isAllowedAssignment(node.expression)
			|| !hasTopLevelSideEffect(node.expression, sourceCode)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow top-level side effects in exported modules.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
