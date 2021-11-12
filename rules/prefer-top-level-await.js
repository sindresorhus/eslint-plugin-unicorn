'use strict';
const {findVariable, getFunctionHeadLocation} = require('eslint-utils');
const {matches, memberExpressionSelector} = require('./selectors/index.js');

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

const topLevelCallExpression = 'Program > ExpressionStatement > CallExpression[optional!=true].expression';
const iife = [
	topLevelCallExpression,
	matches([
		'[callee.type="FunctionExpression"]',
		'[callee.type="ArrowFunctionExpression"]',
	]),
	'[callee.async!=false]',
	'[callee.generator!=true]',
].join('');
const promise = [
	topLevelCallExpression,
	memberExpressionSelector({
		path: 'callee',
		properties: ['then', 'catch', 'finally'],
	}),
].join('');
const identifier = [
	topLevelCallExpression,
	'[callee.type="Identifier"]',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	return {
		[promise](node) {
			return {
				node: node.callee.property,
				messageId: ERROR_PROMISE,
			};
		},
		[iife](node) {
			return {
				node,
				loc: getFunctionHeadLocation(node.callee, context.getSourceCode()),
				messageId: ERROR_IIFE,
			};
		},
		[identifier](node) {
			const variable = findVariable(context.getScope(), node.callee);
			if (!variable || variable.defs.length !== 1) {
				return;
			}

			const [definition] = variable.defs;
			const value = definition.type === 'Variable' && definition.kind === 'const'
				? definition.node.init
				: definition.node;
			if (
				!(
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
