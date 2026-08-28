import {isMethodCall} from './ast/index.js';
import {getStaticValueForControlFlow} from './utils/index.js';

const MESSAGE_ID_OBJECT = 'no-thenable-object';
const MESSAGE_ID_EXPORT = 'no-thenable-export';
const MESSAGE_ID_CLASS = 'no-thenable-class';
const messages = {
	[MESSAGE_ID_OBJECT]: 'Do not add `then` to an object.',
	[MESSAGE_ID_EXPORT]: 'Do not export `then`.',
	[MESSAGE_ID_CLASS]: 'Do not add `then` to a class.',
};

const getStaticKeyValue = (node, context) => getStaticValueForControlFlow(node, context)?.value;

const isStringThen = (node, context) =>
	getStaticKeyValue(node, context) === 'then';

// Resolves the property/member key name, avoiding the cost of `sourceCode.getScope()`
// for the common non-computed and string-literal cases. Only computed keys that
// reference variables need scope resolution.
const isThenKey = (node, context) => {
	const keyNode = node.type === 'MemberExpression' ? node.property : node.key;

	if (keyNode.type === 'Literal') {
		return keyNode.value === 'then';
	}

	if (!node.computed && keyNode.type === 'Identifier') {
		return keyNode.name === 'then';
	}

	return getStaticKeyValue(keyNode, context) === 'then';
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	// `{then() {}}`,
	// `{get then() {}}`,
	// `{[computedKey]() {}}`,
	// `{get [computedKey]() {}}`,
	context.on('ObjectExpression', function * (node) {
		for (const property of node.properties) {
			if (property.type === 'Property' && isThenKey(property, context)) {
				yield {node: property.key, messageId: MESSAGE_ID_OBJECT};
			}
		}
	});

	// `class Foo {then}`,
	// `class Foo {static then}`,
	// `class Foo {get then() {}}`,
	// `class Foo {static get then() {}}`,
	context.on(['PropertyDefinition', 'MethodDefinition'], node => {
		if (isThenKey(node, context)) {
			return {node: node.key, messageId: MESSAGE_ID_CLASS};
		}
	});

	// `foo.then = …`
	// `foo[computedKey] = …`
	context.on('MemberExpression', node => {
		if (
			node.parent.type === 'AssignmentExpression'
			&& node.parent.left === node
			&& isThenKey(node, context)
		) {
			return {node: node.property, messageId: MESSAGE_ID_OBJECT};
		}
	});

	context.on('CallExpression', function * (node) {
		// `Object.defineProperty(foo, 'then', …)`
		// `Reflect.defineProperty(foo, 'then', …)`
		if (
			isMethodCall(node, {
				objects: ['Object', 'Reflect'],
				method: 'defineProperty',
				minimumArguments: 3,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.arguments[0].type !== 'SpreadElement'
		) {
			const [, secondArgument] = node.arguments;
			if (isStringThen(secondArgument, context)) {
				yield {node: secondArgument, messageId: MESSAGE_ID_OBJECT};
			}
		}

		// `Object.fromEntries([['then', …]])`
		if (!(
			isMethodCall(node, {
				object: 'Object',
				method: 'fromEntries',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.arguments[0].type === 'ArrayExpression'
		)) {
			return;
		}

		for (const pairs of node.arguments[0].elements) {
			if (!(pairs?.type === 'ArrayExpression'
				&& pairs.elements[0]) || pairs.elements[0].type === 'SpreadElement') {
				continue;
			}

			const [key] = pairs.elements;

			if (isStringThen(key, context)) {
				yield {node: key, messageId: MESSAGE_ID_OBJECT};
			}
		}
	});

	context.on('Identifier', node => {
		if (node.name !== 'then') {
			return;
		}

		// `export {then}`
		if (
			node.parent.type === 'ExportSpecifier'
			&& node.parent.exported === node
		) {
			return {node, messageId: MESSAGE_ID_EXPORT};
		}

		// `export function then() {}`,
		// `export class then {}`,
		if (
			(node.parent.type === 'FunctionDeclaration' || node.parent.type === 'ClassDeclaration')
			&& node.parent.id === node
			&& node.parent.parent.type === 'ExportNamedDeclaration'
			&& node.parent.parent.declaration === node.parent
		) {
			return {node, messageId: MESSAGE_ID_EXPORT};
		}
	});

	// `export const … = …`;
	context.on('VariableDeclaration', function * (node) {
		if (!(node.parent.type === 'ExportNamedDeclaration' && node.parent.declaration === node)) {
			return;
		}

		for (const variable of context.sourceCode.getDeclaredVariables(node)) {
			if (variable.name === 'then') {
				for (const identifier of variable.identifiers) {
					yield {node: identifier, messageId: MESSAGE_ID_EXPORT};
				}
			}
		}
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
			description: 'Disallow `then` property.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
