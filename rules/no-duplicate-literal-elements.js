'use strict';
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
	'NewExpression',
	'[arguments.0.type="ArrayExpression"]',
	'[callee.name="Set"]',
	' > ',
	'ArrayExpression',
].join('');

const mapSelector = [
	'NewExpression',
	'[arguments.0.type="ArrayExpression"]',
	'[callee.name="Map"]',
	' > ',
	'ArrayExpression',
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
		const {elements} = node;
		const arrayValue = elements
			.filter(({type}) => type === 'Literal')
			.map(({value}) => value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.length > 0) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Set',
					value: duplicatedData
						.map(value => value === null ? 'null' : value)
						.join(', '),
				},
			};
		}
	},
	[mapSelector]: node => {
		const {elements} = node;
		const arrayValue = elements
			.filter(({type, elements}) => type === 'ArrayExpression' && elements[0] && elements[0].type === 'Literal')
			.map(({elements}) => elements[0].value);
		const duplicatedData = checkArrayHasDuplicatedValue(arrayValue);
		if (duplicatedData.length > 0) {
			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					type: 'Map',
					value: duplicatedData
						.map(value => value === null ? 'null' : value)
						.join(', '),
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
