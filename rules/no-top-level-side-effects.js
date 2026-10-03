import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isRuntimeImportSpecifier, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in exported modules.',
};

const knownPureMethods = new Map([
	['react', new Set([
		'memo',
		'forwardRef',
		'lazy',
		'createContext',
		'createRef',
		'createElement',
		'cloneElement',
		'isValidElement',
	])],
	['eslint/config', new Set(['defineConfig'])],
	['@eslint/config-helpers', new Set(['defineConfig'])],
	['vite', new Set(['defineConfig'])],
	['vitest/config', new Set(['defineConfig', 'defineProject'])],
	['rollup', new Set(['defineConfig'])],
	['astro/config', new Set(['defineConfig'])],
]);

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

const isKnownPureCall = (node, sourceCode) => {
	if (node.type !== 'CallExpression' || node.optional) {
		return false;
	}

	const callee = unwrapTypeScriptExpression(node.callee);
	const isMember = callee.type === 'MemberExpression';
	if (isMember && (callee.computed || callee.optional)) {
		return false;
	}

	const reference = unwrapTypeScriptExpression(isMember ? callee.object : callee);
	if (reference.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(reference), reference);
	return variable?.defs.some(definition => {
		if (
			definition.type !== 'ImportBinding'
			|| definition.parent.type !== 'ImportDeclaration'
			|| !isRuntimeImportSpecifier(definition.node)
		) {
			return false;
		}

		const methods = knownPureMethods.get(definition.parent.source.value);
		if (!methods) {
			return false;
		}

		const specifier = definition.node;
		return isMember
			? methods.has(callee.property.name) && (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier')
			: specifier.type === 'ImportSpecifier' && methods.has(specifier.imported.name ?? specifier.imported.value);
	}) ?? false;
};

const hasExpressionSideEffect = (node, sourceCode) => {
	node = unwrapTypeScriptExpression(node);

	if (isKnownPureCall(node, sourceCode)) {
		return node.arguments.some(argument => hasExpressionSideEffect(argument, sourceCode));
	}

	return node.type === 'TaggedTemplateExpression'
		|| hasSideEffect(node, sourceCode);
};

const hasTopLevelSideEffect = (node, sourceCode) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'ClassExpression') {
		return node.superClass ? hasTopLevelSideEffect(node.superClass, sourceCode) : false;
	}

	return hasExpressionSideEffect(node, sourceCode);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

	// `export default init()` runs at module evaluation time just like a bare expression does
	context.on('ExportDefaultDeclaration', node => {
		const {declaration} = node;
		if (
			!shouldCheck
			|| (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration')
			|| isInScriptSetup(node, scriptSetupRange, sourceCode)
			|| isAllowedAssignment(declaration)
			|| !hasTopLevelSideEffect(declaration, sourceCode)
		) {
			return;
		}

		return {
			node: declaration,
			messageId: MESSAGE_ID,
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
