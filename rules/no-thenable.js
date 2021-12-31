'use strict';
const {getStaticValue} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const getKeyName = require('./utils/get-key-name.js');

const MESSAGE_ID_OBJECT = 'no-thenable-object';
const MESSAGE_ID_EXPORT = 'no-thenable-export';
const MESSAGE_ID_CLASS = 'no-thenable-class';
const messages = {
	[MESSAGE_ID_OBJECT]: 'Do not add `then` to an object.',
	[MESSAGE_ID_EXPORT]: 'Do not export `then`.',
	[MESSAGE_ID_CLASS]: 'Do not add `then` to a class.',
};

const isStringThen = (node, context) => {
	const result = getStaticValue(node, context.getScope());

	return result && result.value === 'then';
};

const cases = [
	// `{then() {}}`,
	// `{get then() {}}`,
	// `{[computedKey]() {}}`,
	// `{get [computedKey]() {}}`,
	{
		selector: 'ObjectExpression > Property.properties > .key',
		test: (node, context) => getKeyName(node.parent, context.getScope()) === 'then',
		messageId: MESSAGE_ID_OBJECT,
	},
	// `class Foo {then}`,
	// `class Foo {static then}`,
	// `class Foo {get then() {}}`,
	// `class Foo {static get then() {}}`,
	{
		selector: ':matches(PropertyDefinition, MethodDefinition) > .key',
		test: (node, context) => getKeyName(node.parent, context.getScope()) === 'then',
		messageId: MESSAGE_ID_CLASS,
	},
	// `foo.then = …`
	// `foo[computedKey] = …`
	{
		selector: 'AssignmentExpression > MemberExpression.left > .property',
		test: (node, context) => getKeyName(node.parent, context.getScope()) === 'then',
		messageId: MESSAGE_ID_OBJECT,
	},
	// `Object.defineProperty(foo, 'then', …)`
	// `Reflect.defineProperty(foo, 'then', …)`
	{
		selector: [
			methodCallSelector({
				objects: ['Object', 'Reflect'],
				method: 'defineProperty',
				minimumArguments: 3,
			}),
			'[arguments.0.type!="SpreadElement"]',
			' > .arguments:nth-child(2)',
		].join(''),
		test: isStringThen,
		messageId: MESSAGE_ID_OBJECT,
	},
	// `Object.fromEntries(['then', …])`
	{
		selector: [
			methodCallSelector({
				object: 'Object',
				method: 'fromEntries',
				argumentsLength: 1,
			}),
			' > ArrayExpression.arguments:nth-child(1)',
			' > .elements:nth-child(1)',
		].join(''),
		test: isStringThen,
		messageId: MESSAGE_ID_OBJECT,
	},
	// `export {then}`
	{
		selector: 'ExportSpecifier.specifiers > Identifier.exported[name="then"]',
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export function then() {}`,
	// `export class then {}`,
	{
		selector: 'ExportNamedDeclaration > :matches(FunctionDeclaration, ClassDeclaration).declaration > Identifier[name="then"].id',
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export const … = …`;
	{
		selector: 'ExportNamedDeclaration > VariableDeclaration.declaration',
		messageId: MESSAGE_ID_EXPORT,
		getNodes: (node, context) => context.getDeclaredVariables(node).flatMap(({name, identifiers}) => name === 'then' ? identifiers : []),
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => Object.fromEntries(
	cases.map(({selector, test, messageId, getNodes}) => [
		selector,
		function * (node) {
			if (getNodes) {
				for (const problematicNode of getNodes(node, context)) {
					yield {node: problematicNode, messageId};
				}

				return;
			}

			if (test && !test(node, context)) {
				return;
			}

			yield {node, messageId};
		},
	]),
);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `then` property.',
		},
		messages,
	},
};
