'use strict';
const MESSAGE_ID = 'no-duplicate-literal-elements';
const messages = {
	[MESSAGE_ID]: 'Hardcoded `{{type}}` of `{{value}}` with duplicates.',
};

const setSselector = [
	'NewExpression',
	'[arguments.0.type="ArrayExpression"]',
	'[callee.name="Set"]',
	' > ',
	'ArrayExpression',
].join('');

const mapSselector = [
	'NewExpression',
	'[arguments.0.type="ArrayExpression"]',
	'[callee.name="Map"]',
	' > ',
	'ArrayExpression',
].join('');

const checkArrayHasDuplicatedValue = array => array.filter((element, index, array_) => array_.indexOf(element) !== index);

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[setSselector]: node => {
		const {elements} = node;
		const arrayValue = elements
			.map(({value}) => value)
			.filter(value => value !== undefined);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.length > 0) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Set',
					value: duplicatedData.join(', '),
				},
			};
		}
	},
	[mapSselector]: node => {
		const {elements} = node;
		const arrayValue = elements
			.map(({elements}) => elements && elements[0] && elements[0].value)
			.filter(value => value !== undefined);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.length > 0) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Map',
					value: duplicatedData.join(', '),
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
			description: 'Hardcoded `Set` and `Map` of literals and consts with duplicates',
		},
		messages,
	},
};
