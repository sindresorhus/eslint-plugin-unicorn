'use strict';
const {findVariable, getFunctionHeadLocation} = require('@eslint-community/eslint-utils');
const {isFunction, isMemberExpression} = require('./ast/index.js');

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

const promiseMethods = ['then', 'catch', 'finally'];
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
	&& promiseMethods.includes(node.parent.property.name)
	&& node.parent.parent.type === 'CallExpression'
	&& node.parent.parent.callee === node.parent;
const isAwaitArgument = node => {
	if (node.parent.type === 'ChainExpression') {
		node = node.parent;
	}

	return node.parent.type === 'AwaitExpression' && node.parent.argument === node;
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	if (context.getFilename().toLowerCase().endsWith('.cjs')) {
		return;
	}

	return {
		CallExpression(node) {
			if (
				!isTopLevelCallExpression(node)
				|| isPromiseMethodCalleeObject(node)
				|| isAwaitArgument(node)
			) {
				return;
			}

			// Promises
			if (isMemberExpression(node.callee, {
				properties: promiseMethods,
				computed: false,
			})) {
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
			const value = definition.type === 'Variable' && definition.kind === 'const'
				? definition.node.init
				: definition.node;
			if (
				!value
				|| !(
					(
						value.type === 'ArrowFunctionExpression'
						|| value.type === 'FunctionExpression'
						|| value.type === 'FunctionDeclaration'
					) && !value.generator && value.async
				)
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
		},
	};
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer top-level await over top-level promises and async function calls.',
		},
		hasSuggestions: true,
		messages,
	},
};
