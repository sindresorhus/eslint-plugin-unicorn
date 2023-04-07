'use strict';
const {methodCallSelector} = require('./selectors/index.js');

const messages = {
	'error/readAsArrayBuffer': 'Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(blob)`.',
	'error/readAsText': 'Prefer `Blob#text()` over `FileReader#readAsText(blob)`.',
};

const cases = [
	{
		selector: methodCallSelector('readAsArrayBuffer'),
	},
	{
		selector: methodCallSelector({
      method: 'readAsText',
      argumentsLength: 1
    }),
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => Object.fromEntries(
	cases.map(({selector}) => [
		selector,
		node => {
			const method = node.callee.property;
			const methodName = method.name;

			return {
				node: method,
				messageId: `error/${methodName}`,
			};
		},
	]),
);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(blob)` and `Blob#text()` over `FileReader#readAsText(blob)`.',
		},
		hasSuggestions: true,
		messages,
	},
};
