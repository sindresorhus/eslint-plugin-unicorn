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

const checkArrayHasDuplicatedValue = array => array.filter((element, index, array_) => array_.indexOf(element) !== index);

const getFirstDuplicateIndex = (list, value) => {
	const firstIndex = list.indexOf(value);
	const newList = [...list];
	newList.splice(firstIndex, 1, {});
	return newList.indexOf(value);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[arraySelector]: node => {
		const {elements} = node.parent;
		const arrayValue = elements
			.filter(({type}) => type === 'Literal')
			.map(({value}) => value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			const currentNodeIndex = elements.indexOf(node);
			const firstDuplicateIndex = getFirstDuplicateIndex(arrayValue, node.value);
			if (currentNodeIndex === firstDuplicateIndex) {
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
		}
	},
	[setSelector]: node => {
		const {elements} = node.parent;
		const arrayValue = elements
			.filter(({type}) => type === 'Literal')
			.map(({value}) => value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			const currentNodeIndex = elements.indexOf(node);
			const firstDuplicateIndex = getFirstDuplicateIndex(arrayValue, node.value);
			if (currentNodeIndex === firstDuplicateIndex) {
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
		}
	},
	[mapSelector]: node => {
		const {elements} = node.parent.parent;
		const arrayValue = elements.map(({elements}) => elements[0].value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.includes(node.value)) {
			const currentNodeIndex = elements.indexOf(node.parent);
			const firstDuplicateIndex = getFirstDuplicateIndex(arrayValue, node.value);
			if (currentNodeIndex === firstDuplicateIndex) {
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
