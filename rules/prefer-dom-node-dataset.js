'use strict';
const isValidVariableName = require('./utils/is-valid-variable-name.js');
const quoteString = require('./utils/quote-string.js');
const {methodCallSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-dom-node-dataset';
const messages = {
	[MESSAGE_ID]: 'Prefer `.dataset` over `setAttribute(…)`.'
};

const selector = [
	methodCallSelector({
		name: 'setAttribute',
		length: 2
	}),
	'[arguments.0.type="Literal"]'
].join('');

const parseNodeText = (context, argument) => context.getSourceCode().getText(argument);

const dashToCamelCase = string => string.replace(/-[a-z]/g, s => s[1].toUpperCase());

const fix = (context, node, fixer) => {
	const [nameNode, valueNode] = node.arguments;
	const calleeObject = parseNodeText(context, node.callee.object);

	const name = dashToCamelCase(nameNode.value.slice(5));
	const value = parseNodeText(context, valueNode);

	const replacement = `${calleeObject}.dataset${
		isValidVariableName(name) ?
			`.${name}` :
			`[${quoteString(name, nameNode.raw.charAt(0))}]`
	} = ${value}`;

	return fixer.replaceText(node, replacement);
};

const create = context => {
	return {
		[selector](node) {
			const name = node.arguments[0].value;

			if (typeof name !== 'string' || !name.startsWith('data-') || name === 'data-') {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fix(context, node, fixer)
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `.dataset` on DOM elements over `.setAttribute(…)`.'
		},
		fixable: 'code',
		messages
	}
};
