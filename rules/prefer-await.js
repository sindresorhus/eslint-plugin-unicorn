'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {removeParentheses, removeMethodCall} = require('./fix/index.js');
const {getParenthesizedText, isParenthesized, getParentheses} = require('./utils/parentheses.js');
const shouldAddParenthesesToCallExpressionCallee = require('./utils/should-add-parentheses-to-call-expression-callee.js');
const getFunctionParameterVariables = require('./utils/get-function-parameter-variables.js');
const needsSemicolon = require('./utils/needs-semicolon.js');

const MESSAGE_ID_ERROR = 'prefer-await/error';
const MESSAGE_ID_SUGGESTION = 'prefer-await/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not use `Promise#{{method}}(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Use `await` expression.',
};

function isInsideTryStatement(node, stopNode) {
	for (; node && node !== stopNode; node = node.parent) {
		if (node.type === 'TryStatement') {
			return true;
		}
	}

	return false;
}

function getProblem({
	callExpression,
	currentFunction,
	context,
	scope,
	functionsHasReturnStatement,
}) {
	const methodNode = callExpression.callee.property;
	const method = methodNode.name;

	const problem = {
		node: methodNode,
		messageId: MESSAGE_ID_ERROR,
		data: {
			method,
		},
	};


	if (
		// If the function is not an `async` function, we can't use `await`
		// We can use suggestion api to turn function into an `async` function
		// Ignore for now
		(currentFunction && !currentFunction.async)
		// These cases not handled
		|| !(
			(
				callExpression.parent.type === 'ExpressionStatement'
				&& callExpression.parent.expression === callExpression
			)
			|| (
				callExpression.parent.type === 'ReturnStatement'
				&& callExpression.parent.argument === callExpression
			)
		)
		|| method !== 'then'
		|| callExpression.arguments.length !== 1
		|| isInsideTryStatement(callExpression, currentFunction)
	) {
		return problem;
	}

	const [callback] = callExpression.arguments;
	const isCallbackFunction = callback.type === 'ArrowFunctionExpression'
		|| callback.type === 'FunctionExpression';
	if (
		isCallbackFunction
		&& (
			callback.async
			|| callback.generator
			|| callback.params.length > 1
			|| callback.params[0]?.type === 'RestElement'
			|| functionsHasReturnStatement.has(callback)
		)
	) {
		return problem;
	}

	const fix = function * (fixer) {
		const sourceCode = context.getSourceCode();
		const isReturnStatementArgument = callExpression.parent.type === 'ReturnStatement';

		if (isCallbackFunction) {
			// `(( foo.then(bar) ))`
			yield * removeParentheses(callExpression, fixer, sourceCode);

			// `callback` is a function
			let shouldCreateScope = false;
			let shouldDefineVariable = false;
			const [parameter] = callback.params;
			if (parameter) {
				const variablesFromParameter = getFunctionParameterVariables(parameter, context).map(({name}) => name);

				if (variablesFromParameter.length > 0) {
					shouldDefineVariable = true;

					const variablesFromCallExpressionScope = new Set(scope.variables.map(({name}) => name))
					shouldCreateScope = variablesFromParameter.some(name => variablesFromCallExpressionScope.has(name));
				}
			}

			if (shouldCreateScope) {
				yield fixer.insertTextBefore(callExpression, '{\n');
			}

			if (shouldDefineVariable) {
				const parameterText = sourceCode.getText(parameter);
				yield fixer.insertTextBefore(callExpression, `let ${parameterText} = `);
			}

			yield fixer.insertTextBefore(callExpression, 'await ');
			yield fixer.insertTextAfter(callExpression, ';');

			yield* removeMethodCall(fixer, callExpression, sourceCode);

			const callbackFunctionBodyText = getParenthesizedText(callback.body, sourceCode);

			yield fixer.insertTextAfter(callExpression, `\n${callbackFunctionBodyText}`);

			if (shouldCreateScope) {
				yield fixer.insertTextAfter(callExpression, '\n}');
			}
		} else {
			// `callback` is a reference

			const isCallbackParenthesized = isParenthesized(callback, sourceCode);

			let callbackText = isCallbackParenthesized
				? getParenthesizedText(callback, sourceCode)
				: sourceCode.getText(callback);

			if (
				!isCallbackParenthesized
				&& shouldAddParenthesesToCallExpressionCallee(callback)
			) {
				callbackText = `(${callbackText})`;
			}

			// Check ASI problem
			const tokenBefore = sourceCode.getTokenBefore(callExpression, sourceCode);

			if (needsSemicolon(tokenBefore, sourceCode, callbackText)) {
				callbackText = `;${callbackText}`;
			}

			yield fixer.insertTextBefore(callExpression, `${callbackText}(await `);

			yield* removeMethodCall(fixer, callExpression, sourceCode);
			yield fixer.insertTextAfter(callExpression, `)`);
		}
	};

	problem.suggest = [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			fix,
		}
	];

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const functionStack = [];
	const promiseCallExpressions = new Set();
	const functionsHasReturnStatement = new Set()

	return {
		':function'(node) {
			functionStack.push(node);
		},
		':function:exit'() {
			functionStack.pop();
		},
		ReturnStatement() {
			const currentFunction = functionStack[functionStack.length - 1];
			functionsHasReturnStatement.add(currentFunction);
		},
		[methodCallSelector(['then', 'catch', 'finally'])](callExpression) {
			const currentFunction = functionStack[functionStack.length - 1];
			promiseCallExpressions.add({
				scope: context.getScope(),
				callExpression,
				currentFunction
			});
		},
		* 'Program:exit'() {
			for (const {callExpression, currentFunction, scope} of promiseCallExpressions) {
				yield getProblem({
					callExpression,
					currentFunction,
					context,
					scope,
					functionsHasReturnStatement,
				})
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `await` operator over `Promise#{then,catch,finally}()`.',
		},
		hasSuggestions: true,
		messages,
	},
};
