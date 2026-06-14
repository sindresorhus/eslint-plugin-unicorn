import {isMethodCall} from './ast/index.js';
import {isKnownNonString} from './utils/index.js';

const MESSAGE_ID = 'prefer-string-trim-start-end';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#{{replacement}}()` over `String#{{method}}()`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['trimLeft', 'trimRight'],
			argumentsLength: 0,
			optionalCall: false,
		})) {
			return;
		}

		// Skip receivers that are provably not strings (e.g. a typed array)
		if (isKnownNonString(callExpression.callee.object, context)) {
			return;
		}

		const node = callExpression.callee.property;
		const method = node.name;
		const replacement = method === 'trimLeft' ? 'trimStart' : 'trimEnd';

		return {
			node,
			messageId: MESSAGE_ID,
			data: {method, replacement},
			fix: fixer => fixer.replaceText(node, replacement),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
