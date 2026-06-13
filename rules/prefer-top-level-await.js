import {findVariable, getFunctionHeadLocation} from '@eslint-community/eslint-utils';
import {isFunction, isMemberExpression, isMethodCall} from './ast/index.js';
import {isLogicalExpression} from './utils/index.js';

const ERROR_PROMISE = 'promise';
const ERROR_IIFE = 'iife';
const ERROR_IDENTIFIER = 'identifier';
const SUGGESTION_ADD_AWAIT = 'add-await';
const messages = {
	[ERROR_PROMISE]: 'Prefer top-level await over using a promise chain.',
	[ERROR_IIFE]: 'Prefer top-level await over an async IIFE.',
	[ERROR_IDENTIFIER]: 'Prefer top-level await over an async function `{{name}}` call.',
	[SUGGESTION_ADD_AWAIT]: 'Insert `await`.',
};

const promisePrototypeMethods = ['then', 'catch', 'finally'];
const isTopLevelCallExpression = node => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (
			isFunction(ancestor)
			|| ancestor.type === 'ClassDeclaration'
			|| ancestor.type === 'ClassExpression'
		) {
			return false;
		}
	}

	return true;
};

const isPromiseMethodCalleeObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& !node.parent.computed
	&& node.parent.property.type === 'Identifier'
	&& promisePrototypeMethods.includes(node.parent.property.name)
	&& node.parent.parent.type === 'CallExpression'
	&& node.parent.parent.callee === node.parent;

const isSchemaIdentifier = node =>
	node.type === 'Identifier'
	&& (
		node.name === 'schema'
		|| node.name.endsWith('Schema')
	);

const allowedSchemaIdentifierMethods = new Set([
	'catch',
	'default',
	'nullable',
	'nullish',
	'optional',
]);

const terminalSchemaMethods = new Set(['parse', 'safeParse', 'spa']);
const promiseLikeSchemaMethods = new Set(['then', 'finally']);
const zodNamespaceProperties = new Set(['coerce']);

const isUnsupportedSchemaProperty = (propertyName, isCalled) =>
	promiseLikeSchemaMethods.has(propertyName)
	|| terminalSchemaMethods.has(propertyName)
	|| propertyName.endsWith('Async')
	|| (isCalled && zodNamespaceProperties.has(propertyName));

const isSchemaCatchObject = node => {
	let expression = node;
	let hasCallExpression = false;
	let hasMemberExpression = false;
	let isCurrentMemberCalled = false;
	let hasUncalledMemberExpression = false;
	let hasCalledMemberExpressionAfterUncalledMemberExpression = false;
	const methodNames = [];
	const uncalledMemberNames = [];

	while (true) {
		if (expression.type === 'ChainExpression') {
			expression = expression.expression;
			continue;
		}

		if (expression.type === 'CallExpression') {
			hasCallExpression = true;
			expression = expression.callee;
			isCurrentMemberCalled = true;
			continue;
		}

		if (expression.type === 'MemberExpression') {
			if (
				expression.computed
				|| expression.property.type !== 'Identifier'
			) {
				return false;
			}

			const propertyName = expression.property.name;
			if (isUnsupportedSchemaProperty(propertyName, isCurrentMemberCalled)) {
				return false;
			}

			hasMemberExpression = true;
			if (!isCurrentMemberCalled) {
				hasUncalledMemberExpression = true;
				uncalledMemberNames.push(propertyName);
			} else if (hasUncalledMemberExpression) {
				hasCalledMemberExpressionAfterUncalledMemberExpression = true;
			}

			methodNames.push(propertyName);
			expression = expression.object;
			isCurrentMemberCalled = false;
			continue;
		}

		break;
	}

	if (
		isSchemaIdentifier(expression)
		&& !hasUncalledMemberExpression
		&& methodNames.every(methodName => allowedSchemaIdentifierMethods.has(methodName))
	) {
		return true;
	}

	return expression.type === 'Identifier'
		&& expression.name === 'z'
		&& hasCallExpression
		&& hasMemberExpression
		&& !hasCalledMemberExpressionAfterUncalledMemberExpression
		&& uncalledMemberNames.every(propertyName => zodNamespaceProperties.has(propertyName));
};

const isAwaitExpressionArgument = node => {
	if (node.parent.type === 'ChainExpression') {
		node = node.parent;
	}

	return node.parent.type === 'AwaitExpression' && node.parent.argument === node;
};

const variableDeclaratorInitializerWrappers = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const isVariableDeclaratorInitializer = node => {
	while (variableDeclaratorInitializerWrappers.has(node.parent.type)) {
		node = node.parent;
	}

	return node.parent.type === 'VariableDeclarator' && node.parent.init === node;
};

const isArrayElementWrapper = node => (
	(node.parent.type === 'ChainExpression' && node.parent.expression === node)
	|| (
		node.parent.type === 'ConditionalExpression'
		&& (
			node.parent.consequent === node
			|| node.parent.alternate === node
		)
	)
	|| (
		isLogicalExpression(node.parent)
		&& (
			node.parent.right === node
			|| (
				node.parent.left === node
				&& node.parent.operator !== '&&'
			)
		)
	)
);

// `Promise.{all,allSettled,any,race}([foo()])`
const isInPromiseMethods = node => {
	let expression = node;
	while (isArrayElementWrapper(expression)) {
		expression = expression.parent;
	}

	if (
		expression.parent.type !== 'ArrayExpression'
		|| !expression.parent.elements.includes(expression)
	) {
		return false;
	}

	const arrayExpression = expression.parent;
	return isMethodCall(arrayExpression.parent, {
		object: 'Promise',
		methods: ['all', 'allSettled', 'any', 'race'],
		argumentsLength: 1,
	})
	&& arrayExpression.parent.arguments[0] === arrayExpression;
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	if (context.filename.toLowerCase().endsWith('.cjs')) {
		return;
	}

	context.on('CallExpression', node => {
		if (
			!isTopLevelCallExpression(node)
			|| isPromiseMethodCalleeObject(node)
			|| isAwaitExpressionArgument(node)
			|| isVariableDeclaratorInitializer(node)
			|| isInPromiseMethods(node)
		) {
			return;
		}

		// Promises
		if (isMemberExpression(node.callee, {
			properties: promisePrototypeMethods,
			computed: false,
		})) {
			if (
				node.callee.property.name === 'catch'
				&& isSchemaCatchObject(node.callee.object)
			) {
				return;
			}

			return {
				node: node.callee.property,
				messageId: ERROR_PROMISE,
			};
		}

		const {sourceCode} = context;

		// IIFE
		if (
			(node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression')
			&& node.callee.async
			&& !node.callee.generator
		) {
			return {
				node,
				loc: getFunctionHeadLocation(node.callee, sourceCode),
				messageId: ERROR_IIFE,
			};
		}

		// Identifier
		if (node.callee.type !== 'Identifier') {
			return;
		}

		const variable = findVariable(sourceCode.getScope(node), node.callee);
		if (!variable || variable.defs.length !== 1) {
			return;
		}

		const [definition] = variable.defs;
		// `definition.kind` is populated by espree but is undefined under
		// `@typescript-eslint/parser`, so fall back to `definition.parent.kind`
		// (the enclosing VariableDeclaration) to stay cross-parser. See #2946.
		// Note: non-`const` kinds — `let`, `var`, `using`, `await using` — all
		// take the else branch and harmlessly bail at the `isFunction` guard
		// below, preserving the rule's intentional const-only behavior.
		const variableKind = definition.type === 'Variable'
			? (definition.kind ?? definition.parent?.kind)
			: undefined;
		const value = variableKind === 'const'
			? definition.node.init
			: definition.node;
		if (
			!value
			|| !(isFunction(value) && !value.generator && value.async)
		) {
			return;
		}

		return {
			node,
			messageId: ERROR_IDENTIFIER,
			data: {name: node.callee.name},
			suggest: [
				{
					messageId: SUGGESTION_ADD_AWAIT,
					fix: fixer => fixer.insertTextBefore(node, 'await '),
				},
			],
		};
	});
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer top-level await over top-level promises and async function calls.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
