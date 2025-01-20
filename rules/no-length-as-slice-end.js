import {isMethodCall, isMemberExpression} from './ast/index.js';
import {removeArgument} from './fix/index.js';
import {isSameReference} from './utils/index.js';

const MESSAGE_ID = 'no-length-as-slice-end';
const messages = {
	[MESSAGE_ID]: 'Passing `….length` as the `end` argument is unnecessary.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'slice',
			argumentsLength: 2,
			optionalCall: false,
		})) {
			return;
		}

		const secondArgument = callExpression.arguments[1];
		const node = secondArgument.type === 'ChainExpression' ? secondArgument.expression : secondArgument;

		if (
			!isMemberExpression(node, {property: 'length', computed: false})
			|| !isSameReference(callExpression.callee.object, node.object)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => removeArgument(fixer, secondArgument, context.sourceCode),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `.length` as the `end` argument of `{Array,String,TypedArray}#slice()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
