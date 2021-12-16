'use strict';
const {newExpressionSelector} = require('./selectors/index.js');
const MESSAGE_ID = 'no-duplicate-literal-elements';
const messages = {
	[MESSAGE_ID]: 'Hardcoded `{{type}}` of `{{value}}` with duplicates.',
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

const checkArrayHasDuplicatedValue = array => array.filter((element, index, array_) => array_.indexOf(element) !== index);

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[arraySelector]: node => {
		const {elements} = node.parent;
		const arrayValue = elements
			.filter(({type}) => type === 'Literal')
			.map(({value}) => value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Array',
					value: String(node.value),
				},
			};
		}
	},
	[setSelector]: node => {
		const {elements} = node.parent;
		const arrayValue = elements
			.filter(({type}) => type === 'Literal')
			.map(({value}) => value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Set',
					value: String(node.value),
				},
			};
		}
	},
	[mapSelector]: node => {
		const {elements} = node.parent.parent;
		const arrayValue = elements.map(({elements}) => elements[0].value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Map',
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
