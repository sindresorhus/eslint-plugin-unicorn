'use strict';
const {
	isLogicNot,
	isBooleanCall,
	getBooleanAncestor,
	isSafelyBooleanCastable,
} = require('./utils/boolean.js');

const MESSAGE_ID = 'no-unnecessary-negation';
const messages = {
	[MESSAGE_ID]: 'Expression can be simpified.',
};

function removeParens(string_) {
	return string_.replace(/[()]/g, '');
}

function isCompare(node, operator) {
	return node.type === 'BinaryExpression' && node.operator === operator;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();
	const getNodeRaw = node => sourceCode.text.slice(...node.range);
	const getNodeRawPositive = (node, save) => {
		if (isCompare(node, '!==')) {
			return `${getNodeRaw(node.left)} === ${getNodeRaw(node.right)}`;
		}

		if (isCompare(node, '!=')) {
			return `${getNodeRaw(node.left)} == ${getNodeRaw(node.right)}`;
		}

		if (save) {
			return getNodeRaw(node);
		}

		if (isLogicNot(node.parent)) {
			return `!${getNodeRaw(node.parent)}`;
		}

		return `!!(${getNodeRaw(node)})`;
	};

	const getNodeRawNeative = node => {
		if (isCompare(node, '===')) {
			return `${getNodeRaw(node.left)} !== ${getNodeRaw(node.right)}`;
		}

		if (isCompare(node, '==')) {
			return `${getNodeRaw(node.left)} != ${getNodeRaw(node.right)}`;
		}

		if (isCompare(node, '!==') || isCompare(node, '!=')) {
			return getNodeRaw(node);
		}

		if (isLogicNot(node.parent)) {
			return getNodeRaw(node.parent);
		}

		return `!(${getNodeRaw(node)})`;
	};

	return {
		[[
			'UnaryExpression[operator=\'!\']',
			'CallExpression[callee.name=\'Boolean\'][arguments.length=1]',
		].join(',')](node) {
			const child = node.argument || node.arguments[0];
			if (isLogicNot(child) || isBooleanCall(child)) {
				return;
			}

			let {node: ancestor, isNegative, depth} = getBooleanAncestor(child);
			const save = isNegative || isSafelyBooleanCastable(ancestor);

			if (isCompare(child, '!==') || isCompare(child, '!=')) {
				isNegative = !isNegative;
				depth += 1;
			} else if (!save && depth === 2) {
				return;
			}

			const simpified = isNegative
				? getNodeRawNeative(child)
				: getNodeRawPositive(child, save);

			if (removeParens(getNodeRaw(ancestor)) === removeParens(simpified)) {
				return;
			}

			context.report({
				node: ancestor,
				messageId: MESSAGE_ID,
				fix(fixer) {
					return [fixer.replaceTextRange(ancestor.range, simpified)];
				},
			});
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Dissallow unnecessary negations.',
		},
		fixable: 'code',
		schema: [],

		messages,
	},
};
