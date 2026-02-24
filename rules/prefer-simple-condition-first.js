import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToLogicalExpressionChild,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-simple-condition-first';
const MESSAGE_ID_SUGGESTION = 'prefer-simple-condition-first/suggestion';

const messages = {
	[MESSAGE_ID]: 'Prefer simple condition first in `{{operator}}` expression.',
	[MESSAGE_ID_SUGGESTION]: 'Swap conditions.',
};

/**
Check if a node is a "simple" condition:
1. Bare identifier (`foo`)
2. `identifier === literal`, `identifier !== literal`, or `identifier === identifier`
*/
function isSimple(node) {
	if (node.type === 'Identifier') {
		return true;
	}

	if (
		node.type === 'BinaryExpression'
		&& (node.operator === '===' || node.operator === '!==')
	) {
		const leftIsSimple = node.left.type === 'Identifier' || node.left.type === 'Literal';
		const rightIsSimple = node.right.type === 'Identifier' || node.right.type === 'Literal';
		return leftIsSimple && rightIsSimple
			&& (node.left.type === 'Identifier' || node.right.type === 'Identifier');
	}

	// A chain of all-simple conditions is considered simple to prevent fix oscillation
	if (node.type === 'LogicalExpression') {
		return isSimple(node.left) && isSimple(node.right);
	}

	return false;
}

/**
Check if an AST subtree contains any node that makes it unsafe to auto-fix (reorder):
calls, side effects, or expressions that can throw.
*/
function isUnsafeToAutoFix(node) {
	if (!node || typeof node !== 'object') {
		return false;
	}

	if (
		node.type === 'CallExpression'
		|| node.type === 'NewExpression'
		|| node.type === 'TaggedTemplateExpression'
		|| node.type === 'AssignmentExpression'
		|| node.type === 'UpdateExpression'
	) {
		return true;
	}

	// Deep member expression chains (2+ levels) can throw
	if (node.type === 'MemberExpression' && node.object.type === 'MemberExpression') {
		return true;
	}

	for (const key of Object.keys(node)) {
		if (key === 'parent') {
			continue;
		}

		const value = node[key];
		if (Array.isArray(value)) {
			if (value.some(child => isUnsafeToAutoFix(child))) {
				return true;
			}
		} else if (value && typeof value.type === 'string' && isUnsafeToAutoFix(value)) {
			return true;
		}
	}

	return false;
}

function getSwapText(node, context, {operator, property}) {
	const isNodeParenthesized = isParenthesized(node, context);
	let text = isNodeParenthesized
		? getParenthesizedText(node, context)
		: context.sourceCode.getText(node);

	if (
		!isNodeParenthesized
		&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property})
	) {
		text = `(${text})`;
	}

	return text;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (node.operator !== '&&' && node.operator !== '||') {
			return;
		}

		if (!isSimple(node.right) || isSimple(node.left)) {
			return;
		}

		const rightText = getSwapText(node.right, context, {operator: node.operator, property: 'left'});
		const leftText = getSwapText(node.left, context, {operator: node.operator, property: 'right'});

		const fix = fixer => fixer.replaceTextRange(
			[getParenthesizedRange(node.left, context)[0], getParenthesizedRange(node.right, context)[1]],
			`${rightText} ${node.operator} ${leftText}`,
		);

		// Use suggestion (not auto-fix) when left is unsafe to reorder (calls, side effects, throws) or is a chain
		const isChain = node.left.type === 'LogicalExpression' && node.left.operator === node.operator;
		if (isChain || isUnsafeToAutoFix(node.left)) {
			return {
				node,
				loc: sourceCode.getLoc(node.right),
				messageId: MESSAGE_ID,
				data: {operator: node.operator},
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix,
					},
				],
			};
		}

		return {
			node,
			loc: sourceCode.getLoc(node.right),
			messageId: MESSAGE_ID,
			data: {operator: node.operator},
			fix,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer simple conditions first in logical expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
