'use strict';

const {methodCallSelector} = require('./selectors/index.js');
const isSameReference = require('./utils/is-same-reference.js');

const MESSAGE_ID = 'preferNumberIsInteger';
const MESSAGE_ID_SUGGEST = 'preferNumberIsIntegerSuggestion';
const messages = {
	[MESSAGE_ID]: 'Replace `{{original}}` with `Number.isInteger({{variable}})`.',
	[MESSAGE_ID_SUGGEST]: 'Prefer `Number.isInteger()` for integer checks.',
};

const equalsSelector = ':matches([operator="==="],[operator="=="])';

// `value % 1 === 0`
const modulo1Selector = [
	'BinaryExpression',
	'[left.type="BinaryExpression"]',
	'[left.operator="%"]',
	'[left.right.value=1]',
	equalsSelector,
	'[right.value="0"]',
].join('');

// `(value ^ 0) === value`
// `(value | 0) === value`
const mathOperatorSelector = [
	'BinaryExpression',
	'[left.type="BinaryExpression"]',
	`:matches(${['^', '|'].map(operator => `[left.operator="${operator}"]`).join(',')})`,
	'[left.right.value=0]',
	equalsSelector,
].join('');

// `Number.parseInt(value,10) === value`
const numberParseIntSelector = [
	'BinaryExpression',
	'[left.type="CallExpression"]',
	'[left.callee.type="MemberExpression"]',
	'[left.callee.object.name="Number"]',
	'[left.callee.property.name="parseInt"]',
	'[left.arguments.1.value=10]',
	equalsSelector,
].join('');

// `_.isInteger(value)`
const lodashIsIntegerSelector = [
	methodCallSelector({method: 'isInteger', objects: ['_', 'lodash', 'underscore']}),
].join('');

// `Math.round(value) === value`
const mathRoundSelector = [
	'BinaryExpression',
	methodCallSelector({method: 'round', object: 'Math', path: 'left'}),
	equalsSelector,
].join('');

// `~~value === value`
const bitwiseNotSelector = [
	'BinaryExpression',
	'[left.type="UnaryExpression"]',
	'[left.operator="~"]',
	'[left.argument.type="UnaryExpression"]',
	'[left.argument.operator="~"]',
	equalsSelector,
].join('');

function createNodeListener(sourceCode, variableGetter) {
	return node => {
		const variable = variableGetter(node);

		if (!variable) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				variable,
				original: sourceCode.getText(node),
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST,
				fix: fixer => fixer.replaceText(node, `Number.isInteger(${variable})`),
			}],
		};
	};
}

function getNodeName(node) {
	switch (node.type) {
		case 'Identifier': {
			return node.name;
		}

		case 'ChainExpression': {
			return getNodeName(node.expression);
		}

		case 'MemberExpression': {
			return `${getNodeName(node.object)}.${getNodeName(node.property)}`;
		}

		default: {
			return '';
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[modulo1Selector]: createNodeListener(sourceCode, node => getNodeName(node.left.left)),
		[mathOperatorSelector]: createNodeListener(sourceCode, node => {
			if (isSameReference(node.left.left, node.right)) {
				return getNodeName(node.right);
			}
		}),
		[numberParseIntSelector]: createNodeListener(sourceCode, node => {
			if (
				isSameReference(node.left.arguments[0], node.right)
			) {
				return getNodeName(node.right);
			}
		}),
		[lodashIsIntegerSelector]: createNodeListener(sourceCode, node => getNodeName(node.arguments[0])),
		[mathRoundSelector]: createNodeListener(sourceCode, node => {
			if (
				isSameReference(node.left.arguments[0], node.right)
			) {
				return getNodeName(node.right);
			}
		}),
		[bitwiseNotSelector]: createNodeListener(sourceCode, node => {
			if (isSameReference(node.left.argument.argument, node.right)) {
				return getNodeName(node.right);
			}
		}),
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number.isInteger()` for integer checking.',
		},
		hasSuggestions: true,
		messages,
	},
};
