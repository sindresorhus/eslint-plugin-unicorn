'use strict';
const {} = require('./selectors/index.js');
const {} = require('./fix/index.js');
const {isParenthesized, getParenthesizedText} = require('./utils/parentheses.js');
const isSameReference = require('./utils/is-same-reference.js');
const shouldAddParenthesesToLogicalExpressionChild = require('./utils/should-add-parentheses-to-logical-expression-child.js');


const MESSAGE_ID_ERROR = 'prefer-logical-operator-over-ternary/error';
const MESSAGE_ID_SUGGESTION = 'prefer-logical-operator-over-ternary/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using logical operator over ternary.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}` operator.',
};

function isSameNode(left, right, sourceCode) {
	if (isSameReference(left, right)) {
		return true;
	}

	if (left.type !== right.type) {
		return false;
	}

	switch (left.type) {
		case 'AwaitExpression':
			return isSameNode(left.argument, right.argument, sourceCode);

		case 'LogicalExpression':
			return (
				left.operator === right.operator
				&& isSameNode(left.left, right.left, sourceCode)
				&& isSameNode(left.right, right.right, sourceCode)
			);

		case 'UnaryExpression':
			return (
				left.operator === right.operator
				&& left.prefix === right.prefix
				&& isSameNode(left.argument, right.argument, sourceCode)
			);

		case 'UpdateExpression':
			return false;
	}

	return sourceCode.getText(left) === sourceCode.getText(right);
}

function fix({
	fixer,
	sourceCode,
	conditionalExpression,
	left,
	right,
	operator,
}) {
	const text = [left, right].map((node, index) => {
		const isNodeParenthesized = isParenthesized(node, sourceCode);
		let text = isNodeParenthesized ? getParenthesizedText(node, sourceCode) : sourceCode.getText(node);

		if (
			!isNodeParenthesized
			&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property: index === 0 ? 'left' : 'right'})
		) {
			text = `(${text})`;
		}

		return text;
	}).join(` ${operator} `);

	// TODO: Check ASI
	// TODO: Check parentheses

	return fixer.replaceText(conditionalExpression, text);
}

function getProblem({
	sourceCode,
	conditionalExpression,
	left,
	right,
}) {
	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_ERROR,
		suggest: ['??', '||'].map(operator => ({
			messageId: MESSAGE_ID_SUGGESTION,
			data: {operator},
			fix: fixer => fix({
				fixer,
				sourceCode,
				conditionalExpression,
				left,
				right,
				operator,
			})
		}))
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		ConditionalExpression(conditionalExpression) {
			const {test, consequent, alternate} = conditionalExpression;

			// `foo ? foo : bar`
			if (isSameNode(test, consequent, sourceCode)) {
				return getProblem({
					sourceCode,
					conditionalExpression,
					left: test,
					right: alternate,
				});
			}

			// `!bar ? foo : bar`
			if (
				test.type === 'UnaryExpression'
				&& test.operator === '!'
				&& test.prefix
				&& isSameNode(test.argument, alternate, sourceCode)
			) {
				return getProblem({
					sourceCode,
					conditionalExpression,
					left: test.argument,
					right: consequent,
				})
			}
		}
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using logical operator over ternary.',
		},

		hasSuggestions: true,
		messages,
	},
};
