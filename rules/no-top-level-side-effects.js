import {findVariable} from '@eslint-community/eslint-utils';
import {
	getAssignmentTargets,
	getOutermostChainAndTypeScriptExpression,
	getParentheses,
	isRuntimeImportSpecifier,
	isTypeOnlyDefinition,
	unwrapChainAndTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'This invocation may cause side effects when the module is imported.',
	'global-mutation': 'Do not modify global state when the module is imported.',
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
	['@stylistic/eslint-plugin', new Set(['configs.customize'])],
	['stylelint', new Set(['createPlugin'])],
	['vite', new Set(['defineConfig'])],
	['vitest/config', new Set(['defineConfig', 'defineProject'])],
	['@playwright/test', new Set(['defineConfig'])],
	['playwright/test', new Set(['defineConfig'])],
	['cypress', new Set(['defineConfig'])],
	['rollup', new Set(['defineConfig'])],
	['rolldown', new Set(['defineConfig'])],
	['tsdown', new Set(['defineConfig'])],
	['astro/config', new Set(['defineConfig'])],
	['vitepress', new Set(['defineConfig'])],
	['@rsbuild/core', new Set(['defineConfig'])],
	['@rslib/core', new Set(['defineConfig'])],
	['@rspack/cli', new Set(['defineConfig'])],
	['drizzle-kit', new Set(['defineConfig'])],
	['unocss', new Set(['defineConfig'])],
	['@pandacss/dev', new Set(['defineConfig'])],
	['nuxt/config', new Set(['defineNuxtConfig'])],
	['memoize', new Set(['default'])],
	['debounce', new Set(['default'])],
	['onetime', new Set(['default'])],
	['p-memoize', new Set(['default'])],
	['p-debounce', new Set(['default', 'promise', 'default.promise'])],
	['throttleit', new Set(['default'])],
	['p-limit', new Set(['default', 'limitFunction'])],
	['node:util', new Set(['promisify', 'callbackify'])],
	['lodash', new Set(['debounce', 'throttle', 'memoize', 'once'])],
	['lodash-es', new Set(['debounce', 'throttle', 'memoize', 'once'])],
]);

for (const source of ['lodash', 'lodash-es']) {
	for (const method of ['debounce', 'throttle', 'memoize', 'once']) {
		for (const extension of ['', '.js']) {
			knownPureExports.set(`${source}/${method}${extension}`, new Set(['default']));
		}
	}
}

const exportDeclarationTypes = new Set([
	'ExportAllDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
]);

const mutatingMethods = new Map([
	['Object', new Set(['assign', 'defineProperty', 'defineProperties', 'freeze', 'seal', 'preventExtensions', 'setPrototypeOf'])],
	['Reflect', new Set(['defineProperty', 'deleteProperty', 'set', 'preventExtensions', 'setPrototypeOf'])],
]);

const invocationTypes = new Set(['CallExpression', 'NewExpression', 'TaggedTemplateExpression', 'ImportExpression']);

const isTypeOnlyReference = (node, sourceCode) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	return variable?.isValueVariable === false
		|| (variable?.defs.length > 0 && variable.defs.every(isTypeOnlyDefinition));
};

// Type-only exports (`export type`, `export interface`, `export declare`, `export {type Foo}`, …) are erased when TypeScript is compiled to JavaScript, so a file whose only exports are type-only has no runtime exports.
const isTypeOnlyExport = (node, sourceCode) =>
	node.exportKind === 'type'
	|| node.declaration?.type === 'TSInterfaceDeclaration'
	|| node.declaration?.declare === true
	|| (node.type === 'ExportDefaultDeclaration' && isTypeOnlyReference(node.declaration, sourceCode))
	// `export {type Foo}` keeps `exportKind: 'value'` on the declaration, but every specifier is type-only, so it is fully erased. An empty `export {}` marker does not activate the rule either.
	|| (node.specifiers?.length > 0 && node.specifiers.every(specifier =>
		specifier.exportKind === 'type'
		|| (!node.source && isTypeOnlyReference(specifier.local, sourceCode)),
	));

const isExportDeclaration = (node, sourceCode) =>
	exportDeclarationTypes.has(node.type)
	&& !isTypeOnlyExport(node, sourceCode)
	&& (node.type !== 'ExportNamedDeclaration' || Boolean(node.declaration) || Boolean(node.source) || node.specifiers.length > 0);

const isModuleEvaluation = (node, sourceCode) => {
	for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
		if (scope.type === 'function' || (scope.type === 'class-field-initializer' && !scope.block.parent.static)) {
			return false;
		}
	}

	return true;
};

const isGlobalMutationTarget = (node, sourceCode) => {
	node = unwrapChainAndTypeScriptExpression(node);
	while (node.type === 'MemberExpression') {
		node = unwrapChainAndTypeScriptExpression(node.object);
	}

	return sourceCode.isGlobalReference(node);
};

const isGlobalMutation = (node, sourceCode) => {
	if (['AssignmentExpression', 'ForInStatement', 'ForOfStatement'].includes(node.type)) {
		return [...getAssignmentTargets(node.left)].some(target => isGlobalMutationTarget(target, sourceCode));
	}

	if (node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && node.operator === 'delete')) {
		return isGlobalMutationTarget(node.argument, sourceCode);
	}

	if (node.type !== 'CallExpression' || !node.arguments[0]) {
		return false;
	}

	const callee = unwrapChainAndTypeScriptExpression(node.callee);
	if (callee.type !== 'MemberExpression') {
		return false;
	}

	const receiver = unwrapChainAndTypeScriptExpression(callee.object);
	const method = callee.computed ? callee.property.type === 'Literal' && callee.property.value : callee.property.name;
	// An explicit receiver can receive the write instead of the target.
	if (receiver.name === 'Reflect' && method === 'set' && (node.arguments.length !== 3 || node.arguments.some(argument => argument.type === 'SpreadElement'))) {
		return false;
	}

	return sourceCode.isGlobalReference(receiver)
		&& (mutatingMethods.get(receiver.name)?.has(method) ?? false)
		&& isGlobalMutationTarget(node.arguments[0], sourceCode);
};

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
			if (exportName !== 'default') {
				return exportNames.has(memberPath ? `${exportName}.${memberPath}` : exportName);
			}
		}

		return (specifier.type !== 'ImportNamespaceSpecifier' || memberPath !== '')
			&& exportNames.has(memberPath || 'default');
	}) ?? false;
};

const isKnownPureCall = (node, sourceCode, pureExports) => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	let reference = unwrapChainAndTypeScriptExpression(node.callee);
	const members = [];
	while (reference.type === 'MemberExpression') {
		if (reference.computed && (reference.property.type !== 'Literal' || typeof reference.property.value !== 'string')) {
			return false;
		}

		members.unshift(reference.computed ? reference.property.value : reference.property.name);
		reference = unwrapChainAndTypeScriptExpression(reference.object);
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
			&& isKnownPureImport(unwrapChainAndTypeScriptExpression(definition.node.init), property.key.name ?? property.key.value, sourceCode, pureExports);
	}) ?? false;
};

const isPureAnnotatedCall = (node, sourceCode) => {
	if (node.type !== 'CallExpression' && node.type !== 'NewExpression') {
		return false;
	}

	return [node, getOutermostChainAndTypeScriptExpression(node)].some(expression => {
		const parentheses = getParentheses(expression, {sourceCode});
		let token = sourceCode.getTokenBefore(expression, {includeComments: true});
		while (token && (token.type === 'Block' || token.type === 'Line' || parentheses.includes(token))) {
			if (token.type === 'Block' && /[#@]__PURE__/v.test(token.value)) {
				return true;
			}

			token = sourceCode.getTokenBefore(token, {includeComments: true});
		}

		return false;
	});
};

const isTrustedInvocation = (node, sourceCode, pureExports) => {
	if (isPureAnnotatedCall(node, sourceCode) || isKnownPureCall(node, sourceCode, pureExports)) {
		return true;
	}

	let child = node;
	for (let {parent} = node; parent; parent = parent.parent) {
		const isMutationExpression = parent.type !== 'ForInStatement' && parent.type !== 'ForOfStatement' && isGlobalMutation(parent, sourceCode);
		if (isMutationExpression || (child === parent.callee && isPureAnnotatedCall(parent, sourceCode))) {
			return true;
		}

		child = parent;
	}

	return false;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	if (
		sourceCode.lines[0].startsWith('#!')
		|| sourceCode.parserServices?.isAstro
		|| sourceCode.parserServices?.isSvelte
		|| sourceCode.ast.body.every(node => !isExportDeclaration(node, sourceCode))
	) {
		return;
	}

	const {allow, checkUnknownCalls} = context.options[0];
	const scriptSetupRange = getScriptSetupRange(sourceCode);
	const reported = new WeakSet();

	const shouldCheckNode = node => !isInScriptSetup(node, scriptSetupRange, sourceCode)
		&& isModuleEvaluation(node, sourceCode);

	const getProblem = (node, messageId) => {
		reported.add(node);
		for (let {parent} = node; parent; parent = parent.parent) {
			if (invocationTypes.has(parent.type)) {
				reported.add(parent);
			}
		}

		return {node, messageId};
	};

	for (const nodeType of ['AssignmentExpression', 'ForInStatement', 'ForOfStatement', 'UpdateExpression', 'UnaryExpression', 'CallExpression']) {
		context.on(nodeType, node => {
			if (shouldCheckNode(node) && isGlobalMutation(node, sourceCode)) {
				const target = node.type === 'ForInStatement' || node.type === 'ForOfStatement' ? node.left : node;
				return getProblem(target, 'global-mutation');
			}
		});
	}

	// `export default init()` runs at module evaluation time just like a bare expression does, as do declaration initializers and other evaluated expressions.
	if (checkUnknownCalls) {
		const pureExports = new Map(knownPureExports);
		for (const [source, exportNames] of Object.entries(allow)) {
			pureExports.set(source, new Set([...pureExports.get(source) ?? [], ...exportNames]));
		}

		for (const nodeType of invocationTypes) {
			context.onExit(nodeType, node => {
				if (shouldCheckNode(node) && !reported.has(node) && !isTrustedInvocation(node, sourceCode, pureExports)) {
					return getProblem(node, MESSAGE_ID);
				}
			});
		}
	}
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
			recommended: true,
		},
		schema: [{
			type: 'object',
			properties: {
				checkUnknownCalls: {
					type: 'boolean',
					description: 'Check invocations whose side effects are unknown.',
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
		defaultOptions: [{allow: {}, checkUnknownCalls: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
