'use strict';

const MESSAGE_ID = 'preferNumberIsInteger';
const MESSAGE_ID_SUGGEST = 'preferNumberIsIntegerSuggestion';
const messages = {
	[MESSAGE_ID]: 'Replace `{{original}}` with `Number.isInteger({{variable}})`.',
	[MESSAGE_ID_SUGGEST]: 'Prefer `Number.isInteger()` for integer checks.',
};

const equalsSelector = ':matches([operator="==="],[operator="=="])';

// Value % 1 === 0
const modulo1Selector = [
	'BinaryExpression',
	'[left.type="BinaryExpression"]',
	'[left.left.type="Identifier"]',
	'[left.operator="%"]',
	'[left.right.value=1]',
	equalsSelector,
	'[right.value="0"]',
].join('');

// (value^0) === value OR (value | 0) === value
const mathOperatorSelector = [
	'BinaryExpression',
	'[left.type="BinaryExpression"]',
	'[left.left.type="Identifier"]',
	`:matches(${['^', '|'].map(operator => `[left.operator="${operator}"]`).join(',')})`,
	'[left.right.value=0]',
	equalsSelector,
	'[right.type="Identifier"]',
].join('');

// ParseInt(value,10) === value
const parseIntSelector = [
	'BinaryExpression',
	'[left.type="CallExpression"]',
	'[left.callee.name="parseInt"]',
	'[left.arguments.0.type="Identifier"]',
	'[left.arguments.1.value=10]',
	equalsSelector,
	'[right.type="Identifier"]',
].join('');

// _.isInteger(value)
const lodashIsIntegerSelector = [
	'CallExpression',
	`:matches(${['_', 'lodash', 'underscore'].map(callee => `[callee.object.name="${callee}"]`).join(',')})`,
	'[callee.property.name="isInteger"]',
].join('');

// Math.round(value) === value
const mathRoundSelector = [
	'BinaryExpression',
	'[left.type="CallExpression"]',
	'[left.callee.type="MemberExpression"]',
	'[left.callee.object.name="Math"]',
	'[left.callee.property.name="round"]',
	'[left.arguments.0.type="Identifier"]',
	equalsSelector,
	'[right.type="Identifier"]',
].join('');

// ~~value === value
const bitwiseNotSelector = [
	'BinaryExpression',
	'[left.type="UnaryExpression"]',
	'[left.operator="~"]',
	'[left.argument.type="UnaryExpression"]',
	'[left.argument.operator="~"]',
	'[left.argument.argument.type="Identifier"]',
	equalsSelector,
	'[right.type="Identifier"]',
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[modulo1Selector]: createNodeListener(sourceCode, node => node.left.left.name),
		[mathOperatorSelector]: createNodeListener(sourceCode, node => {
			const variableName = node.right.name;

			if (variableName === node.left.left.name) {
				return variableName;
			}
		}),
		[parseIntSelector]: createNodeListener(sourceCode, node => {
			const variableName = node.right.name;

			if (
				node.left.arguments[0].name === variableName
			) {
				return variableName;
			}
		}),
		[lodashIsIntegerSelector]: createNodeListener(sourceCode, node => node.arguments[0].name),
		[mathRoundSelector]: createNodeListener(sourceCode, node => {
			const variableName = node.right.name;

			if (node.left.arguments[0].name === variableName) {
				return variableName;
			}
		}),
		[bitwiseNotSelector]: createNodeListener(sourceCode, node => {
			const variableName = node.right.name;

			if (node.left.argument.argument.name === variableName) {
				return variableName;
			}
		}),
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer Number.isInteger for integer checking',
		},
		fixable: 'code',
		messages,
		hasSuggestions: true,
	},
};
