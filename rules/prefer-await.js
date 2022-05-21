'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {removeParentheses, removeMethodCall} = require('./fix/index.js');
const {getParenthesizedText, isParenthesized} = require('./utils/parentheses.js');
const shouldAddParenthesesToCallExpressionCallee = require('./utils/should-add-parentheses-to-call-expression-callee.js');

const MESSAGE_ID= 'prefer-await';
const messages = {
	[MESSAGE_ID]: 'Do not use `Promise#{{method}}(…)`.',
};

function getProblem({
	callExpression,
	currentFunction,
	context,
}) {
	const methodNode = callExpression.callee.property;
	const method = methodNode.name;

	const problem = {
		node: methodNode,
		messageId: MESSAGE_ID,
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
		|| callExpression.parent.type !== 'ExpressionStatement'
		|| method !== 'then'
		|| callExpression.arguments.length !== 1
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
		)
	) {
		return problem;
	}


	problem.fix = function * (fixer) {
		const sourceCode = context.getSourceCode();

		// `(( foo.then(bar) ))`
		yield * removeParentheses(callExpression, fixer, sourceCode);

		if (isCallbackFunction) {
			// `foo.then(bar)` -> `await foo`
		} else {
			// `callback` is a reference

			const isCallbackParenthesized = isParenthesized(callback, sourceCode);

			yield fixer.insertTextBefore(callExpression, 'await ');

			// There should be no ASI problem

			let callbackText = isCallbackParenthesized
				? getParenthesizedText(callback, sourceCode)
				: sourceCode.getText(callback);

			if (
				!isCallbackParenthesized
				&& shouldAddParenthesesToCallExpressionCallee(callback)
			) {
				callbackText = `(${callbackText})`;
			}

			yield fixer.insertTextBefore(callExpression, `${callbackText}(`);

			yield* removeMethodCall(fixer, callExpression, sourceCode);
			yield fixer.insertTextAfter(callExpression, `)`);
		}
	};

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const functionStack = [];
	const promiseCallExpressions = new Set();

	return {
		':function'(node) {
			functionStack.push(node);
		},
		':function:exit'() {
			functionStack.pop();
		},
		[methodCallSelector(['then', 'catch', 'finally'])](callExpression) {
			const currentFunction = functionStack[functionStack.length - 1];
			promiseCallExpressions.add({callExpression, currentFunction});
		},
		* 'Program:exit'() {
			for (const {callExpression, currentFunction} of promiseCallExpressions) {
				yield getProblem({callExpression, currentFunction, context})
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
		fixable: 'code',
		messages,
	},
};
