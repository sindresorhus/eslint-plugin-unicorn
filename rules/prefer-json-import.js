import {findVariable} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isCallExpression,
	isMemberExpression,
	isMethodCall,
	isNewExpression,
} from './ast/index.js';
import {
	escapeString,
	getConstVariableInitializer,
	getStaticValueForControlFlow,
	isNodeMatchesNameOrPath,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-json-import';
const MESSAGE_ID_SUGGESTION = 'prefer-json-import/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer a JSON import over reading and parsing a JSON file.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the declaration with a JSON import (changes loading time and caches the data).',
};

function getImportedMethod(node, sourceCode) {
	let {callee} = node;
	const properties = [];
	while (isMemberExpression(callee, {computed: false, optional: false})) {
		properties.unshift(callee.property.name);
		callee = callee.object;
	}

	if (callee.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(sourceCode.getScope(callee), callee);
	const definition = variable?.defs[0];
	if (definition?.type !== 'ImportBinding' || definition.parent.importKind === 'type' || definition.node.importKind === 'type') {
		return;
	}

	const specifier = definition.node;
	if (specifier.type === 'ImportSpecifier' && specifier.imported.name !== 'default') {
		properties.unshift(specifier.imported.name ?? specifier.imported.value);
	}

	const module = definition.parent.source.value.replace(/^node:/, '');
	const method = properties.join('.');
	return {module, method};
}

function isFileRead(node, awaited, sourceCode) {
	if (!isCallExpression(node, {minimumArguments: 1, maximumArguments: 2, optional: false})) {
		return false;
	}

	const {module, method} = getImportedMethod(node, sourceCode) ?? {};
	return awaited
		? (module === 'fs/promises' && method === 'readFile') || (module === 'fs' && method === 'promises.readFile')
		: module === 'fs' && method === 'readFileSync';
}

function isJsonRequire(node, context) {
	if (!isCallExpression(node, {argumentsLength: 1, optional: false}) || node.callee.type !== 'Identifier') {
		return false;
	}

	const path = getStaticStringValue(node.arguments[0]);
	if (path === undefined || !path.endsWith('.json') || !(path.startsWith('./') || path.startsWith('../'))) {
		return false;
	}

	const initializer = unwrapTypeScriptExpression(getConstVariableInitializer(node.callee, context));
	if (!isCallExpression(initializer, {argumentsLength: 1, optional: false})) {
		return false;
	}

	const {module, method} = getImportedMethod(initializer, context.sourceCode) ?? {};
	return module === 'module'
		&& method === 'createRequire'
		&& isNodeMatchesNameOrPath(unwrapTypeScriptExpression(initializer.arguments[0]), 'import.meta.url');
}

function isSupportedEncoding(node, context) {
	node = unwrapTypeScriptExpression(node);
	if (!node) {
		return true;
	}

	if (node.type === 'ObjectExpression') {
		const [property] = node.properties;
		if (
			node.properties.length !== 1
			|| property.type !== 'Property'
			|| property.computed
			|| property.kind !== 'init'
			|| property.method
			|| (property.key.name ?? property.key.value) !== 'encoding'
		) {
			return false;
		}

		node = property.value;
	}

	const result = getStaticValueForControlFlow(node, context);
	if (!result) {
		return false;
	}

	const {value} = result;
	return value === null || value === undefined || (typeof value === 'string' && /^utf-?8$/i.test(value));
}

function getJsonPath(node, context) {
	node = unwrapTypeScriptExpression(node);
	let moduleRelative = false;
	if (isNewExpression(node, {name: 'URL', argumentsLength: 2})) {
		const [path, base] = node.arguments;
		if (!isNodeMatchesNameOrPath(base, 'import.meta.url')) {
			return;
		}

		node = path;
		moduleRelative = true;
	}

	const value = getStaticValueForControlFlow(node, context)?.value;
	if (typeof value !== 'string' || !value.endsWith('.json')) {
		return;
	}

	return {value, moduleRelative};
}

function getJsonReadPath(node, context) {
	if (!isMethodCall(node, {
		object: 'JSON', method: 'parse', argumentsLength: 1, optionalCall: false, optionalMember: false,
	})) {
		return;
	}

	let read = unwrapTypeScriptExpression(node.arguments[0]);
	const awaited = read.type === 'AwaitExpression';
	if (awaited) {
		read = unwrapTypeScriptExpression(read.argument);
	}

	if (!isFileRead(read, awaited, context.sourceCode) || !isSupportedEncoding(read.arguments[1], context)) {
		return;
	}

	return getJsonPath(read.arguments[0], context);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	if (sourceCode.ast.sourceType !== 'module') {
		return;
	}

	context.on('VariableDeclarator', declarator => {
		const declaration = declarator.parent;
		const {parent} = declaration;
		if (parent.type !== 'Program' && !(parent.type === 'ExportNamedDeclaration' && parent.parent.type === 'Program')) {
			return;
		}

		const node = unwrapTypeScriptExpression(declarator.init);
		const jsonRequire = isJsonRequire(node, context);
		const path = jsonRequire
			? {value: getStaticStringValue(node.arguments[0]), moduleRelative: true}
			: getJsonReadPath(node, context);
		if (!path) {
			return;
		}

		const problem = {node, messageId: MESSAGE_ID};
		const unsafePathCharacters = jsonRequire ? /[#%?\\]/ : /[#?\\]/;
		if (
			path.moduleRelative
			&& (path.value.startsWith('./') || path.value.startsWith('../'))
			&& !unsafePathCharacters.test(path.value)
			&& parent.type === 'Program'
			&& declaration.kind === 'const'
			&& declaration.declarations.length === 1
			&& declarator.id.type === 'Identifier'
			&& !declarator.id.typeAnnotation
			&& !node.typeArguments
			&& declarator.init === node
			&& sourceCode.getCommentsInside(declaration).length === 0
		) {
			const fix = fixer => fixer.replaceText(declaration, `import ${declarator.id.name} from ${escapeString(path.value)} with {type: 'json'};`);
			if (jsonRequire) {
				problem.fix = fix;
			} else {
				problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, fix}];
			}
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer JSON imports over reading and parsing JSON files.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
