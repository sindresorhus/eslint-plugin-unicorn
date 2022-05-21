'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {} = require('./fix/index.js');

const MESSAGE_ID= 'prefer-await';
const messages = {
	[MESSAGE_ID]: 'Do not use `Promise#{{method}}(…)`.',
};

function getProblem({
	callExpression,
	currentFunction
}) {
	const method = callExpression.callee.property;

	const problem = {
		node: method,
		messageId: MESSAGE_ID,
		data: {
			method: method.name,
		},
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
				yield getProblem({callExpression, currentFunction})
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
		messages,
	},
};
