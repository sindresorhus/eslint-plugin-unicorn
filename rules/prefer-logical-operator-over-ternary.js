import {
	isParenthesized,
	getParenthesizedText,
	isSameReference,
	shouldAddParenthesesToLogicalExpressionChild,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-logical-operator-over-ternary/error';
const MESSAGE_ID_SUGGESTION = 'prefer-logical-operator-over-ternary/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using a logical operator over a ternary.',
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
		case 'AwaitExpression': {
			return isSameNode(left.argument, right.argument, sourceCode);
		}

		case 'LogicalExpression': {
			return (
				left.operator === right.operator
				&& isSameNode(left.left, right.left, sourceCode)
				&& isSameNode(left.right, right.right, sourceCode)
			);
		}

		case 'UnaryExpression': {
			return (
				left.operator === right.operator
				&& left.prefix === right.prefix
				&& isSameNode(left.argument, right.argument, sourceCode)
			);
		}

		case 'UpdateExpression': {
			return false;
		}

		// No default
	}

	return sourceCode.getText(left) === sourceCode.getText(right);
}

function fix({
	fixer,
	context,
	conditionalExpression,
	left,
	right,
	operator,
}) {
	const {sourceCode} = context;
	let text = [left, right].map((node, index) => {
		const isNodeParenthesized = isParenthesized(node, context);
		let text = isNodeParenthesized ? getParenthesizedText(node, context) : sourceCode.getText(node);

		if (
			!isNodeParenthesized
			&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property: index === 0 ? 'left' : 'right'})
		) {
			text = `(${text})`;
		}

		return text;
	}).join(` ${operator} `);

	// According to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
	// There should be no cases need add parentheses when switching ternary to logical expression

	// ASI
	if (needsSemicolon(sourceCode.getTokenBefore(conditionalExpression), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(conditionalExpression, text);
}

function getProblem({
	context,
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
				context,
				conditionalExpression,
				left,
				right,
				operator,
			}),
		})),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ConditionalExpression', conditionalExpression => {
		const {test, consequent, alternate} = conditionalExpression;

		// `foo ? foo : bar`
		if (isSameNode(test, consequent, sourceCode)) {
			return getProblem({
				context,
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
				context,
				conditionalExpression,
				left: test.argument,
				right: consequent,
			});
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using a logical operator over a ternary.',
			recommended: 'unopinionated',
		},

		hasSuggestions: true,
		messages,
	},
};

export default config;
