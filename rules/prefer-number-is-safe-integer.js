import {isMethodCall} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-number-is-safe-integer/error';
const MESSAGE_ID_SUGGESTION = 'prefer-number-is-safe-integer/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Number.isSafeInteger()` over `Number.isInteger()`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `Number.isInteger()` with `Number.isSafeInteger()`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			!isMethodCall(callExpression, {
				object: 'Number',
				method: 'isInteger',
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| !context.sourceCode.isGlobalReference(callExpression.callee.object)
		) {
			return;
		}

		const propertyNode = callExpression.callee.property;

		return {
			node: propertyNode,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(propertyNode, 'isSafeInteger'),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number.isSafeInteger()` over `Number.isInteger()`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
