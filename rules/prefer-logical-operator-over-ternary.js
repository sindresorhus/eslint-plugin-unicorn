import {
	isMemberExpression,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	isSameReference,
	shouldAddParenthesesToLogicalExpressionChild,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-logical-operator-over-ternary/error';
const MESSAGE_ID_OPTIONAL_CHAIN_ERROR = 'prefer-logical-operator-over-ternary/optional-chain-error';
const MESSAGE_ID_SUGGESTION = 'prefer-logical-operator-over-ternary/suggestion';
const MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION = 'prefer-logical-operator-over-ternary/optional-chain-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using a logical operator over a ternary.',
	[MESSAGE_ID_OPTIONAL_CHAIN_ERROR]: 'Prefer using optional chaining over a ternary.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}` operator.',
	[MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION]: 'Switch to optional chaining.',
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
	// There should be no cases need to add parentheses when switching ternary to logical expression

	// ASI
	if (needsSemicolon(sourceCode.getTokenBefore(conditionalExpression), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(conditionalExpression, text);
}

function getMemberAccessOperatorRange(memberExpression, context) {
	const {sourceCode} = context;
	const [, start] = getParenthesizedRange(memberExpression.object, context);
	const end = memberExpression.computed
		? sourceCode.getRange(sourceCode.getTokenBefore(memberExpression.property, token => token.value === '['))[1]
		: sourceCode.getRange(memberExpression.property)[0];

	return [start, end];
}

function hasCommentInRange(sourceCode, [start, end]) {
	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);

		return commentStart >= start && commentEnd <= end;
	});
}

function getOptionalChainText(memberExpression, context) {
	const {sourceCode} = context;
	const range = getMemberAccessOperatorRange(memberExpression, context);

	if (hasCommentInRange(sourceCode, range)) {
		return;
	}

	const [nodeStart, nodeEnd] = sourceCode.getRange(memberExpression);
	const [operatorStart, operatorEnd] = range;

	return sourceCode.text.slice(nodeStart, operatorStart)
		+ (memberExpression.computed ? '?.[' : '?.')
		+ sourceCode.text.slice(operatorEnd, nodeEnd);
}

function getProblem({
	context,
	conditionalExpression,
	left,
	right,
	operators = ['??', '||'],
}) {
	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_ERROR,
		suggest: operators.map(operator => ({
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

function getNullishCheckReference(node) {
	if (
		node.type !== 'BinaryExpression'
		|| node.operator !== '=='
	) {
		return;
	}

	const leftNullish = isNullLiteral(node.left) || isUndefined(node.left);
	const rightNullish = isNullLiteral(node.right) || isUndefined(node.right);

	if (leftNullish === rightNullish) {
		return;
	}

	return leftNullish ? node.right : node.left;
}

function getNullishTernaryProblem(conditionalExpression, context) {
	const {test, consequent, alternate} = conditionalExpression;
	const reference = getNullishCheckReference(test);

	if (
		!reference
		|| context.sourceCode.getCommentsInside(conditionalExpression).length > 0
	) {
		return;
	}

	if (isSameNode(reference, alternate, context.sourceCode)) {
		return getProblem({
			context,
			conditionalExpression,
			left: alternate,
			right: consequent,
			operators: ['??'],
		});
	}

	if (!(
		isUndefined(consequent)
		&& isMemberExpression(alternate)
		&& !alternate.optional
		&& isSameReference(reference, alternate.object)
	)) {
		return;
	}

	const optionalChainText = getOptionalChainText(alternate, context);

	if (!optionalChainText) {
		return;
	}

	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_OPTIONAL_CHAIN_ERROR,
		suggest: [
			{
				messageId: MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION,
				fix(fixer) {
					let text = optionalChainText;

					if (needsSemicolon(context.sourceCode.getTokenBefore(conditionalExpression), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(conditionalExpression, text);
				},
			},
		],
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ConditionalExpression', conditionalExpression => {
		const {test, consequent, alternate} = conditionalExpression;
		const nullishTernaryProblem = getNullishTernaryProblem(conditionalExpression, context);

		if (nullishTernaryProblem) {
			return nullishTernaryProblem;
		}

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
		languages: [
			'js/js',
		],
	},
};

export default config;
