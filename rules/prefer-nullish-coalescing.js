'use strict';
const {getStaticValue} = require('eslint-utils');
const {matches} = require('./selectors/index.js');
const {isBooleanNode} = require('./utils/boolean.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Prefer `{{replacement}}` over `{{original}}`.',
	[SUGGESTION]: 'Use `{{replacement}}`'
};

const selector = matches([
	'LogicalExpression[operator="||"]',
	'AssignmentExpression[operator="||="]'
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			if (
				[node.parent, node.left, node.right].some(node => node.type === 'LogicalExpression') ||
				isBooleanNode(node)
			) {
				return;
			}

			const {left} = node;

			const staticValue = getStaticValue(left, context.getScope());
			if (staticValue) {
				const {value} = staticValue;
				if (!(typeof value === 'undefined' || value === null)) {
					return;
				}
			}

			const isAssignment = node.type === 'AssignmentExpression';
			const originalOperator = isAssignment ? '||=' : '||';
			const replacementOperator = isAssignment ? '??=' : '??';
			const operatorToken = context.getSourceCode()
				.getTokenAfter(
					node.left,
					token => token.type === 'Punctuator' && token.value === originalOperator
				);

			const messageData = {
				original: originalOperator,
				replacement: replacementOperator
			};
			return {
				node: operatorToken,
				messageId: ERROR,
				data: messageData,
				suggest: [
					{
						messageId: SUGGESTION,
						data: messageData,
						fix: fixer => fixer.replaceText(operatorToken, replacementOperator)
					}
				]
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the nullish coalescing operator(`??`) over the logical OR operator(`||`).'
		},
		messages,
		hasSuggestions: true
	}
};
