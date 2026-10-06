import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isMemberExpression,
	isMethodCall,
	isNewExpression,
} from '../ast/index.js';
import {isGlobalIdentifier, unwrapTypeScriptExpression} from '../utils/index.js';
import typedArrayTypes from './typed-array.js';

const bufferImportSources = new Set(['buffer', 'node:buffer']);
const globalObjectNames = new Set(['globalThis', 'window', 'self', 'global']);
const arrayBufferTypes = ['ArrayBuffer', 'SharedArrayBuffer', 'DataView'];
const nonBufferExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'BinaryExpression',
	'ClassExpression',
	'FunctionExpression',
	'Literal',
	'NewExpression',
	'ObjectExpression',
	'TemplateLiteral',
	'UnaryExpression',
	'UpdateExpression',
]);
const constructorNames = ['Array', ...arrayBufferTypes, ...typedArrayTypes];
const bufferTypeImports = new Map([...bufferImportSources].map(source => [source, new Set(['Buffer'])]));

function getBufferImportSpecifier(identifier, context) {
	if (identifier.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(identifier), identifier);
	const [definition] = variable?.defs ?? [];
	// `import Buffer = require('node:buffer')` binds the module object, not `Buffer`, and has no `ImportDeclaration` source
	if (
		variable?.defs.length !== 1
		|| definition.type !== 'ImportBinding'
		|| definition.parent.type !== 'ImportDeclaration'
		|| !bufferImportSources.has(definition.parent.source.value)
	) {
		return;
	}

	return definition.node;
}

const isBufferModuleObjectImport = specifier =>
	specifier?.type === 'ImportNamespaceSpecifier'
	|| specifier?.type === 'ImportDefaultSpecifier';

/**
Whether `node` refers to the `Buffer` constructor, as a global, `globalThis.Buffer`, or an import (`import {Buffer} from 'node:buffer'` or `buffer.Buffer` on the imported module object).
*/
export function isBufferReference(node, context) {
	const reference = unwrapTypeScriptExpression(node);
	if (isMemberExpression(reference, {property: 'Buffer', computed: false})) {
		const object = unwrapTypeScriptExpression(reference.object);
		const specifier = getBufferImportSpecifier(object, context);
		return (globalObjectNames.has(object.name) && isGlobalIdentifier(object, context))
			|| isBufferModuleObjectImport(specifier);
	}

	if (reference.type !== 'Identifier') {
		return false;
	}

	const specifier = getBufferImportSpecifier(reference, context);
	return (reference.name === 'Buffer' && isGlobalIdentifier(reference, context))
		|| (specifier?.type === 'ImportSpecifier' && specifier.imported.name === 'Buffer');
}

const isConstructorReference = (node, context) => isBufferReference(node, context)
	|| (node.type === 'Identifier' && constructorNames.includes(node.name))
	|| (
		isMemberExpression(node, {properties: constructorNames, computed: false, optional: false})
		&& globalObjectNames.has(node.object.name)
		&& isGlobalIdentifier(node.object, context)
	);

const isBufferFactory = (node, context) =>
	isMethodCall(node, {
		methods: ['from', 'of', 'alloc', 'allocUnsafe', 'allocUnsafeSlow', 'concat', 'copyBytesFrom'],
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})
	&& isBufferReference(node.callee.object, context);

/**
Whether `node` creates a `Buffer`, through a factory like `Buffer.from()`, `new Buffer()`, or `Buffer()`.
*/
export const isBufferExpression = (node, context) => isBufferFactory(node, context)
	|| (
		(isNewExpression(node) || isCallExpression(node, {optional: false}))
		&& isBufferReference(node.callee, context)
	);

/**
Base `createTypeCheckers()` options for telling `Buffer` values apart from arrays, array buffers, and typed arrays. Rules spread it and add their own options.
*/
export const bufferTypeCheckerOptions = {
	checkClassHeritage: false,
	targetTypeNames: new Set(['Buffer']),
	targetTypeImports: bufferTypeImports,
	targetTypeNamespaceImports: bufferTypeImports,
	nonTargetTypeNames: new Set(['Array', 'ReadonlyArray', ...arrayBufferTypes, ...typedArrayTypes]),
	isTargetNode: isBufferExpression,
	isNonTargetNode: (node, context) => nonBufferExpressionTypes.has(node.type)
		|| isConstructorReference(node, context)
		|| isCallExpression(node, {name: 'Array'})
		|| isMethodCall(node, {objects: ['Array', ...typedArrayTypes], methods: ['from', 'of']})
		|| isMethodCall(node, {object: 'Uint8Array', methods: ['fromHex', 'fromBase64']}),
};
