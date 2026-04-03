import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-to-array-at-end';

const messages = {
	[MESSAGE_ID]: 'Prefer calling `{{method}}()` before `toArray()` to avoid creating an intermediate array.',
};

const METHODS = new Set([
	'every',
	'filter',
	'find',
	'flatMap',
	'forEach',
	'map',
	'reduce',
	'some',
]);

const CALLBACK_METHODS = new Set([
	'every',
	'filter',
	'find',
	'flatMap',
	'forEach',
	'map',
	'some',
]);

function isToArrayCall(node) {
	return isMethodCall(node, {
		method: 'toArray',
		argumentsLength: 0,
		optional: false,
	});
}

const create = context => {
	const {sourceCode} = context;
	return {
		CallExpression(node) {
			if (!isMethodCall(node, {
				methods: METHODS,
				optional: false,
			})) {
				return;
			}

			const method = node.callee.property.name;
			const argumentCount = node.arguments.length;

			if (CALLBACK_METHODS.has(method)) {
				if (argumentCount > 1) {
					return;
				}
			} else if (method === 'reduce') {
				if (argumentCount > 2) {
					return;
				}
			}

			const toArrayNode = node.callee.object;
			if (!isToArrayCall(toArrayNode)) {
				return;
			}

			const iteratorNode = toArrayNode.callee.object;

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					method,
				},
				fix(fixer) {
					const iteratorText = sourceCode.getText(iteratorNode);
					const argumentsText = node.arguments.map(argument => sourceCode.getText(argument)).join(', ');
					return fixer.replaceText(
						node,
						`${iteratorText}.${method}(${argumentsText}).toArray()`,
					);
				},
			});
		},
	};
};

export default {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer calling iterator methods before `toArray()`.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
	},
};
