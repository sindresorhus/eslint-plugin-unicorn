'use strict';
const {getStaticValue} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const getPropertyName = require('./utils/get-property-name.js');
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

const returnTrue = () => true;

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
		selector: 'AssignmentExpression[operator="="] > MemberExpression.left > .property',
		test: (node, context) => getPropertyName(node.parent, context.getScope()) === 'then',
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
		test: returnTrue,
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export function then() {}`,
	// `export class then {}`,
	{
		selector: 'ExportNamedDeclaration > :matches(FunctionDeclaration, ClassDeclaration).declaration > Identifier[name="then"].id',
		test: returnTrue,
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export const … = …`;
	{
		selector: 'ExportNamedDeclaration > VariableDeclaration.declaration',
		* check(node, context) {
			const variables = context.getDeclaredVariables(node);
			for (const variable of variables) {
				if (variable.name !== 'then') {
					continue;
				}

				yield {node: variable.identifiers[0], messageId: MESSAGE_ID_EXPORT};
			}
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => Object.fromEntries(
	cases.map(({selector, test, messageId, check}) => [
		selector,
		node => {
			if (check) {
				return check(node, context);
			}

			if (!test(node, context)) {
				return;
			}

			return {node, messageId};
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
		schema: [],
		messages,
	},
};
