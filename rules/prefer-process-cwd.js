import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'preferProcessCwd';
const messages = {
	[MESSAGE_ID]: 'Prefer `process.cwd()` over `path.resolve()` with no arguments.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (
			isMethodCall(node, {
				object: 'path',
				method: 'resolve',
				argumentsLength: 0,
				optional: false,
			})
		) {
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, 'process.cwd()'),
			});
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
export default {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `process.cwd()` over `path.resolve()` with no arguments.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
