import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-add-event-listener-options';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const isBooleanLiteral = node =>
	node?.type === 'Literal'
	&& typeof node.value === 'boolean';

const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'addEventListener',
			argumentsLength: 3,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const optionsNode = callExpression.arguments[2];
		if (!isBooleanLiteral(optionsNode)) {
			return;
		}

		const replacement = `{capture: ${optionsNode.value}}`;
		return {
			node: optionsNode,
			messageId: MESSAGE_ID,
			data: {
				value: String(optionsNode.value),
				replacement,
			},
			fix: fixer => fixer.replaceText(optionsNode, replacement),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer options object over boolean in `.addEventListener()`.',
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
