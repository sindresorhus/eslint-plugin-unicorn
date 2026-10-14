import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isRuntimeImportSpecifier, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in exported modules.',
};

const knownPureExports = new Map([
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
	['vue', new Set(['defineComponent'])],
	['eslint/config', new Set(['defineConfig', 'globalIgnores'])],
	['@eslint/config-helpers', new Set(['defineConfig', 'globalIgnores', 'convertIgnorePatternToMinimatch'])],
	['stylelint', new Set(['createPlugin'])],
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

const isKnownPureImport = (reference, memberPath, sourceCode, pureExports) => {
	if (reference?.type !== 'Identifier') {
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

		const exportNames = pureExports.get(definition.parent.source.value);
		if (!exportNames) {
			return false;
		}

		const specifier = definition.node;
		if (specifier.type === 'ImportSpecifier') {
			const exportName = specifier.imported.name ?? specifier.imported.value;
			return exportNames.has(memberPath ? `${exportName}.${memberPath}` : exportName);
		}

		return (specifier.type === 'ImportDefaultSpecifier' && exportNames.has(memberPath || 'default'))
			|| (specifier.type === 'ImportNamespaceSpecifier' && memberPath !== '' && exportNames.has(memberPath));
	}) ?? false;
};

const isKnownPureCall = (node, sourceCode, pureExports) => {
	if (node.type !== 'CallExpression' || node.optional) {
		return false;
	}

	let reference = unwrapTypeScriptExpression(node.callee);
	const members = [];
	while (reference.type === 'MemberExpression') {
		if (reference.computed || reference.optional) {
			return false;
		}

		members.unshift(reference.property.name);
		reference = unwrapTypeScriptExpression(reference.object);
	}

	if (reference.type !== 'Identifier') {
		return false;
	}

	if (isKnownPureImport(reference, members.join('.'), sourceCode, pureExports)) {
		return true;
	}

	if (members.length > 0) {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(reference), reference);
	return variable?.defs.some(definition => {
		if (
			definition.type !== 'Variable'
			|| definition.parent.kind !== 'const'
			|| definition.node.id.type !== 'ObjectPattern'
		) {
			return false;
		}

		const property = definition.node.id.properties.find(property =>
			property.type === 'Property'
			&& !property.computed
			&& property.value.type === 'Identifier'
			&& property.value.name === reference.name,
		);

		return property !== undefined
			&& isKnownPureImport(unwrapTypeScriptExpression(definition.node.init), property.key.name ?? property.key.value, sourceCode, pureExports);
	}) ?? false;
};

const hasExpressionSideEffect = (node, sourceCode, pureExports) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'ArrayExpression') {
		return node.elements.some(element => element && hasExpressionSideEffect(element, sourceCode, pureExports));
	}

	if (isKnownPureCall(node, sourceCode, pureExports)) {
		return node.arguments.some(argument => hasExpressionSideEffect(argument, sourceCode, pureExports));
	}

	return node.type === 'TaggedTemplateExpression'
		|| hasSideEffect(node, sourceCode);
};

const hasTopLevelSideEffect = (node, sourceCode, pureExports) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'ClassExpression') {
		return node.superClass ? hasTopLevelSideEffect(node.superClass, sourceCode, pureExports) : false;
	}

	return hasExpressionSideEffect(node, sourceCode, pureExports);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {allow, checkDefaultExports} = context.options[0];
	const pureExports = new Map(knownPureExports);
	for (const [source, exportNames] of Object.entries(allow)) {
		pureExports.set(source, new Set([...pureExports.get(source) ?? [], ...exportNames]));
	}

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
			|| !hasTopLevelSideEffect(node.expression, sourceCode, pureExports)
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
			!checkDefaultExports
			|| !shouldCheck
			|| (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration')
			|| isInScriptSetup(node, scriptSetupRange, sourceCode)
			|| isAllowedAssignment(declaration)
			|| !hasTopLevelSideEffect(declaration, sourceCode, pureExports)
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
		schema: [{
			type: 'object',
			properties: {
				checkDefaultExports: {
					type: 'boolean',
					description: 'Check default-exported expressions for side effects.',
				},
				allow: {
					type: 'object',
					description: 'Additional pure export names or member paths by import source.',
					additionalProperties: {
						type: 'array',
						items: {
							type: 'string',
						},
					},
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{allow: {}, checkDefaultExports: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
