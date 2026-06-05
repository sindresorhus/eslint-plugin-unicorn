import {
	getParenthesizedText,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToConditionalExpressionChild,
	shouldAddParenthesesToLogicalExpressionChild,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-nested-ternary';
const messages = {
	[MESSAGE_ID]: 'Do not use unnecessary nested ternary expressions.',
};

function isSameNode(left, right, sourceCode) {
	return sourceCode.getText(left) === sourceCode.getText(right);
}

function getLogicalExpressionChildText(node, context, operator, property) {
	let text = getParenthesizedText(node, context);
	if (
		!isParenthesized(node, context)
		&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property})
	) {
		text = `(${text})`;
	}

	return text;
}

function getConditionalExpressionChildText(node, context) {
	let text = getParenthesizedText(node, context);
	if (
		!isParenthesized(node, context)
		&& shouldAddParenthesesToConditionalExpressionChild(node)
	) {
		text = `(${text})`;
	}

	return text;
}

function getReplacementText({
	context,
	node,
	left,
	operator,
	right,
	consequent,
	alternate,
}) {
	const {sourceCode} = context;
	const testText = [
		getLogicalExpressionChildText(left, context, operator, 'left'),
		getLogicalExpressionChildText(right, context, operator, 'right'),
	].join(` ${operator} `);
	let text = `${testText} ? ${getConditionalExpressionChildText(consequent, context)} : ${getConditionalExpressionChildText(alternate, context)}`;

	if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
		text = `;${text}`;
	}

	return text;
}

function getProblem(context, node, replacement) {
	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	if (context.sourceCode.getCommentsInside(node).length === 0) {
		problem.fix = fixer => fixer.replaceText(node, getReplacementText({
			context,
			node,
			...replacement,
		}));
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ConditionalExpression', node => {
		const {test, consequent, alternate} = node;

		if (
			consequent.type === 'ConditionalExpression'
			&& isSameNode(consequent.alternate, alternate, sourceCode)
		) {
			return getProblem(context, node, {
				left: test,
				operator: '&&',
				right: consequent.test,
				consequent: consequent.consequent,
				alternate: consequent.alternate,
			});
		}

		if (
			alternate.type === 'ConditionalExpression'
			&& isSameNode(consequent, alternate.consequent, sourceCode)
		) {
			return getProblem(context, node, {
				left: test,
				operator: '||',
				right: alternate.test,
				consequent,
				alternate: alternate.alternate,
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
			description: 'Disallow unnecessary nested ternary expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
	},
};

export default config;
