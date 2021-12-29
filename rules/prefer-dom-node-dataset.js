'use strict';
const isValidVariableName = require('./utils/is-valid-variable-name.js');
const quoteString = require('./utils/quote-string.js');
const {methodCallSelector, matches} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-dom-node-dataset';
const messages = {
	[MESSAGE_ID]: 'Prefer `.dataset` over `{{method}}(…)`.',
};

const selector = [
	matches([
		methodCallSelector({method: 'setAttribute', argumentsLength: 2}),
		methodCallSelector({method: 'removeAttribute', argumentsLength: 1}),
	]),
	'[arguments.0.type="Literal"]',
].join('');

const dashToCamelCase = string => string.replace(/-[a-z]/g, s => s[1].toUpperCase());

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[selector](node) {
		const [nameNode] = node.arguments;
		const attributeName = nameNode.value;

		if (typeof attributeName !== 'string' || !attributeName.startsWith('data-') || attributeName === 'data-') {
			return;
		}

		const method = node.callee.property.name;
		const name = dashToCamelCase(attributeName.slice(5));
		let text = isValidVariableName(name) ? `.${name}` : `[${quoteString(name, nameNode.raw.charAt(0))}]`

		const sourceCode = context.getSourceCode();
		text = `${sourceCode.getText(node.callee.object)}.dataset${text}`;

		text = method === 'setAttribute'
			? `${text} = ${sourceCode.getText(node.arguments[1])}`
			: `delete ${text}`;

		return {
			node,
			messageId: MESSAGE_ID,
			data: {method},
			fix: fixer => fixer.replaceText(node, text)
		};
	}
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `.dataset` on DOM elements over `.setAttribute(…)` and `.removeAttribute(…)`.',
		},
		fixable: 'code',
		messages,
	},
};
