'use strict';
const {newExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'no-duplicate-literal-elements';
const messages = {
	[MESSAGE_ID]: 'Remove duplicate {{valueType}} `{{value}}` from the `{{objectType}}`.',
};

const arraySelector = [
	'VariableDeclarator > ArrayExpression > Literal',
	'ExpressionStatement > ArrayExpression > Literal',
	'AssignmentExpression > ArrayExpression > Literal',
].join(',');

const setSelector = [
	newExpressionSelector('Set'),
	'[arguments.0.type="ArrayExpression"]',
	' > ',
	'ArrayExpression > Literal',
].join('');

const mapSelector = [
	newExpressionSelector('Map'),
	'[arguments.0.type="ArrayExpression"]',
	' > ',
	'ArrayExpression > ArrayExpression > Literal:first-child',
].join('');

const getFirstDuplicateElement = (elements, checkedElement) =>
	elements
		.slice(elements.findIndex(({value}) => value === checkedElement.value) + 1)
		.find(({value}) => value === checkedElement.value);

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[arraySelector]: node => {
		const {elements} = node.parent;
		const firstDuplicateElement = getFirstDuplicateElement(elements, node);
		if (firstDuplicateElement === node) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					objectType: 'Array',
					valueType: 'value',
					value: String(node.value),
				},
			};
		}
	},
	[setSelector]: node => {
		const {elements} = node.parent;
		const firstDuplicateElement = getFirstDuplicateElement(elements, node);
		if (firstDuplicateElement === node) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					objectType: 'Set',
					valueType: 'value',
					value: String(node.value),
				},
			};
		}
	},
	[mapSelector]: node => {
		const {elements} = node.parent.parent;
		const mapKeys = elements.map(({elements}) => elements[0]);
		const firstDuplicateElement = getFirstDuplicateElement(mapKeys, node);
		if (firstDuplicateElement === node) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					objectType: 'Map',
					valueType: 'key',
					value: String(node.value),
				},
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow duplicate literal elements in `Array`, `Set` or `Map` key.',
		},
		messages,
	},
};
