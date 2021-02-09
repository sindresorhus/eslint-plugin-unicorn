'use strict';

const {hasSideEffect, isParenthesized, findVariable} = require('eslint-utils');
const methodSelector = require('../utils/method-selector');
const isFunctionSelfUsedInside = require('../utils/is-function-self-used-inside');

const getBinaryExpressionSelector = path => [
	`[${path}.type="BinaryExpression"]`,
	`[${path}.operator="==="]`,
	`:matches([${path}.left.type="Identifier"], [${path}.right.type="Identifier"])`
].join('');
const getFunctionSelector = path => [
	`[${path}.generator=false]`,
	`[${path}.async=false]`,
	`[${path}.params.length=1]`,
	`[${path}.params.0.type="Identifier"]`
].join('');
const isIdentifierNamed = ({type, name}, expectName) => type === 'Identifier' && name === expectName;

function simpleArraySearchRule({method, replacement}) {
	// Add prefix to avoid conflicts in `prefer-includes` rule
	const MESSAGE_ID_PREFIX = `prefer-${replacement}-over-${method}/`;
	const ERROR = `${MESSAGE_ID_PREFIX}/error`;
	const SUGGESTION = `${MESSAGE_ID_PREFIX}/suggestion`;
	const messages = {
		[ERROR]: `Use \`.${replacement}()\` instead of \`.${method}()\` when looking for the index of an item.`,
		[SUGGESTION]: `Replace \`.${method}()\` with \`.${replacement}()\`.`
	};

	const selector = [
		methodSelector({
			name: method,
			length: 1
		}),
		`:matches(${
			[
				// Matches `foo.findIndex(bar => bar === baz)`
				[
					'[arguments.0.type="ArrowFunctionExpression"]',
					getFunctionSelector('arguments.0'),
					getBinaryExpressionSelector('arguments.0.body')
				].join(''),
				// Matches `foo.findIndex(bar => {return bar === baz})`
				// Matches `foo.findIndex(function (bar) {return bar === baz})`
				[
					':matches([arguments.0.type="ArrowFunctionExpression"], [arguments.0.type="FunctionExpression"])',
					getFunctionSelector('arguments.0'),
					'[arguments.0.body.type="BlockStatement"]',
					'[arguments.0.body.body.length=1]',
					'[arguments.0.body.body.0.type="ReturnStatement"]',
					getBinaryExpressionSelector('arguments.0.body.body.0.argument')
				].join('')
			].join(', ')
		})`
	].join('');

	function createListeners(context) {
		const sourceCode = context.getSourceCode();
		const {scopeManager} = sourceCode;

		return {
			[selector](node) {
				const [callback] = node.arguments;
				const binaryExpression = callback.body.type === 'BinaryExpression' ?
					callback.body :
					callback.body.body[0].argument;
				const [parameter] = callback.params;
				const {left, right} = binaryExpression;
				const {name} = parameter;

				let searchValueNode;
				let parameterInBinaryExpression;
				if (isIdentifierNamed(left, name)) {
					searchValueNode = right;
					parameterInBinaryExpression = left;
				} else if (isIdentifierNamed(right, name)) {
					searchValueNode = left;
					parameterInBinaryExpression = right;
				} else {
					return;
				}

				const callbackScope = scopeManager.acquire(callback);
				if (
					// `parameter` is used somewhere else
					findVariable(callbackScope, parameter).references.some(({identifier}) => identifier !== parameterInBinaryExpression) ||
					isFunctionSelfUsedInside(callback, callbackScope)
				) {
					return;
				}

				const method = node.callee.property;
				const problem = {
					node: method,
					messageId: ERROR,
					suggest: []
				};

				const fix = function * (fixer) {
					let text = sourceCode.getText(searchValueNode);
					if (isParenthesized(searchValueNode, sourceCode) && !isParenthesized(callback, sourceCode)) {
						text = `(${text})`;
					}

					yield fixer.replaceText(method, replacement);
					yield fixer.replaceText(callback, text);
				};

				if (hasSideEffect(searchValueNode, sourceCode)) {
					problem.suggest.push({messageId: SUGGESTION, fix});
				} else {
					problem.fix = fix;
				}

				context.report(problem);
			}
		};
	}

	return {messages, createListeners};
}

module.exports = simpleArraySearchRule;
