'use strict';
const {isMethodCall, isMemberExpression} = require('./ast/index.js');
const {removeArgument} = require('./fix/index.js');
const {isSameReference} = require('./utils/index.js');

const MESSAGE_ID = 'no-length-as-slice-end';
const messages = {
	[MESSAGE_ID]: 'Pass `….length` as the `end` argument is unnecessary',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			!isMethodCall(callExpression, {
				method: 'slice',
				argumentsLength: 2,
				optionalCall: false,
			})
			|| !isMemberExpression(callExpression.arguments[1], {
				property: 'length',
				optional: false,
				computed: false,
			})
			|| !isSameReference(
				callExpression.callee.object,
				callExpression.arguments[1].object,
			)
		) {
			return;
		}

		const lengthNode = callExpression.arguments[1];

		return {
			node: lengthNode,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => removeArgument(fixer, lengthNode, context.sourceCode),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Forbid use `.length` as the `end` argument of `{Array,String,TypedArray}#slice()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
