import {getParenthesizedRange, getParenthesizedText} from './utils/index.js';
import {
	containsOptionalChain,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-duplicate-logical-operands';
const MESSAGE_ID_SUGGESTION = 'no-duplicate-logical-operands/suggestion';
const messages = {
	[MESSAGE_ID]: 'This operand duplicates the left operand.',
	[MESSAGE_ID_SUGGESTION]: 'Remove the duplicate operand.',
};

const simpleComputedPropertyTypes = new Set(['Identifier', 'ThisExpression', 'Literal']);
const safelyAutofixableReferenceTypes = new Set(['Identifier', 'ThisExpression']);

const isSimpleComputedProperty = node => {
	node = unwrapExpression(node);

	return simpleComputedPropertyTypes.has(node.type);
};

const isSimpleReference = node => {
	node = unwrapExpression(node);

	if (containsOptionalChain(node)) {
		return false;
	}

	switch (node.type) {
		case 'Identifier':
		case 'Super':
		case 'ThisExpression': {
			return true;
		}

		case 'MemberExpression': {
			return isSimpleReference(node.object)
				&& (!node.computed || isSimpleComputedProperty(node.property));
		}

		default: {
			return false;
		}
	}
};

const isSafelyAutofixableReference = node => safelyAutofixableReferenceTypes.has(node.type);

const isInsideWithStatement = node => {
	for (let current = node.parent; current; current = current.parent) {
		if (current.type === 'WithStatement') {
			return true;
		}
	}

	return false;
};

const isCommentInsideOperand = (comment, operand, context) => {
	const [commentStart, commentEnd] = context.sourceCode.getRange(comment);
	const [operandStart, operandEnd] = getParenthesizedRange(operand, context);
	return commentStart >= operandStart && commentEnd <= operandEnd;
};

const canReplaceWithoutDroppingComments = (node, operand, context) =>
	context.sourceCode.getCommentsInside(node).every(comment => isCommentInsideOperand(comment, operand, context));

const getAdjacentLeftOperand = node => (
	node.left.type === 'LogicalExpression' && node.left.operator === node.operator
		? node.left.right
		: node.left
);

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('LogicalExpression', node => {
		if (node.operator !== '&&' && node.operator !== '||') {
			return;
		}

		const adjacentLeftOperand = getAdjacentLeftOperand(node);

		if (
			isInsideWithStatement(node)
			|| !isSimpleReference(adjacentLeftOperand)
			|| !isSimpleReference(node.right)
			|| !isSame(adjacentLeftOperand, node.right)
		) {
			return;
		}

		const problem = {
			node: node.right,
			messageId: MESSAGE_ID,
		};

		if (!canReplaceWithoutDroppingComments(node, node.left, context)) {
			return problem;
		}

		const replacement = getParenthesizedText(node.left, context);
		const fix = fixer => fixer.replaceText(node, replacement);

		if (
			isSafelyAutofixableReference(adjacentLeftOperand)
			&& isSafelyAutofixableReference(node.right)
		) {
			return {
				...problem,
				fix,
			};
		}

		return {
			...problem,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			],
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow adjacent duplicate operands in logical expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
