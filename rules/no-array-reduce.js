'use strict';
const {isMethodCall} = require('./ast/index.js');
const {isNodeValueNotFunction, isArrayPrototypeProperty} = require('./utils/index.js');

const MESSAGE_ID = 'no-reduce';
const messages = {
	[MESSAGE_ID]: '`Array#{{method}}()` is not allowed',
};

const cases = [
	// `array.{reduce,reduceRight}()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				methods: ['reduce', 'reduceRight'],
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& !isNodeValueNotFunction(callExpression.arguments[0]),
		getMethodNode: callExpression => callExpression.callee.property,
		isSimpleOperation(callExpression) {
			const [callback] = callExpression.arguments;

			return (
				callback
				&& (
					// `array.reduce((accumulator, element) => accumulator + element)`
					(callback.type === 'ArrowFunctionExpression' && callback.body.type === 'BinaryExpression')
					// `array.reduce((accumulator, element) => {return accumulator + element;})`
					// `array.reduce(function (accumulator, element){return accumulator + element;})`
					|| (
						(callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
						&& callback.body.type === 'BlockStatement'
						&& callback.body.body.length === 1
						&& callback.body.body[0].type === 'ReturnStatement'
						&& callback.body.body[0].argument.type === 'BinaryExpression'
					)
				)
			);
		},
	},
	// `[].{reduce,reduceRight}.call()` and `Array.{reduce,reduceRight}.call()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'call',
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(callExpression.callee.object, {
				properties: ['reduce', 'reduceRight'],
			})
			&& (
				!callExpression.arguments[1]
				|| !isNodeValueNotFunction(callExpression.arguments[1])
			),
		getMethodNode: callExpression => callExpression.callee.object.property,
	},
	// `[].{reduce,reduceRight}.apply()` and `Array.{reduce,reduceRight}.apply()`
	{
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'apply',
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(callExpression.callee.object, {
				properties: ['reduce', 'reduceRight'],
			}),
		getMethodNode: callExpression => callExpression.callee.object.property,
	},
];

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowSimpleOperations: {
				type: 'boolean',
				default: true,
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {allowSimpleOperations} = {allowSimpleOperations: true, ...context.options[0]};

	return {
		* CallExpression(callExpression) {
			for (const {test, getMethodNode, isSimpleOperation} of cases) {
				if (!test(callExpression)) {
					continue;
				}

				if (allowSimpleOperations && isSimpleOperation?.(callExpression)) {
					continue;
				}

				const methodNode = getMethodNode(callExpression);
				yield {
					node: methodNode,
					messageId: MESSAGE_ID,
					data: {method: methodNode.name},
				};
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
			description: 'Disallow `Array#reduce()` and `Array#reduceRight()`.',
			recommended: true,
		},
		schema,
		messages,
	},
};
