import {isMethodCall} from './ast/index.js';
import {isNumericLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-confusing-array-splice';
const messages = {
	[MESSAGE_ID]: 'Confusing `{{method}}` call with `deleteCount` of {{deleteCount}}.'
};

export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow confusing uses of `Array#splice` and `Array#toSpliced` when `deleteCount` is `0` or `1`.',
			recommended: false
		},
		fixable: false,
		hasSuggestions: false,
		schema: [],
		messages
	},
	create(context) {
		return {
			CallExpression(node) {
				if (!isMethodCall(node, {
					methods: ['splice', 'toSpliced'],
					minimumArguments: 2
				})) {
					return;
				}

				const deleteCountNode = node.arguments[1];
				if (!isNumericLiteral(deleteCountNode)) {
					return;
				}

				const deleteCount = deleteCountNode.value;
				if (deleteCount !== 0 && deleteCount !== 1) {
					return;
				}

				context.report({
					node,
					messageId: MESSAGE_ID,
					data: {
						method: node.callee.property.name,
						deleteCount
					}
				});
			}
		};
	}
};
