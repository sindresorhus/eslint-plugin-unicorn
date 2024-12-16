'use strict';
const getIndentString = require('./utils/get-indent-string.js');

const MESSAGE_ID = 'prefer-class-fields/error';
const messages = {
	[MESSAGE_ID]:
		'Prefer class field declaration over `this` assignment in constructor for static values.',
};

/**
 * @param {import('eslint').Rule.Node} node
 * @returns {node is import('estree').ExpressionStatement & {expression: import('estree').AssignmentExpression & {left: import('estree').MemberExpression & {object: import('estree').ThisExpression}}}}
 */
const isThisAssignmentExpression = node => {
	if (
		node.type !== 'ExpressionStatement'
		|| node.expression.type !== 'AssignmentExpression'
	) {
		return false;
	}

	const lhs = node.expression.left;

	if (!lhs.object || lhs.object.type !== 'ThisExpression') {
		return false;
	}

	return true;
};

/**
 * @template Array
 * @param {Array} array
 * @returns {Array}
 */
const reverseArray = array => [...array].reverse();

/**
 * @param {import('eslint').Rule.Node} node
 * @param {import('eslint').Rule.RuleContext['sourceCode']} sourceCode
 * @param {import('eslint').Rule.RuleFixer} fixer
 */
const removeThisFieldAssignment = (node, sourceCode, fixer) => {
	const {line} = node.loc.start;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;

	return isOnlyNodeOnLine
		? fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		])
		: fixer.remove(node);
};

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => {
	const {sourceCode} = context;

	return {
		ClassBody(node) {
			const constructor = node.body.find(x => x.kind === 'constructor');

			if (!constructor || constructor.type !== 'MethodDefinition') {
				return;
			}

			const constructorBody = constructor.value.body.body;
			const classBodyStartRange = [node.range[0], node.range[0] + 1];
			const indent = getIndentString(constructor, sourceCode);

			for (const node of reverseArray(constructorBody)) {
				if (
					isThisAssignmentExpression(node)
					&& node.expression.right?.type === 'Literal'
				) {
					return {
						node,
						messageId: MESSAGE_ID,

						/** @param {import('eslint').Rule.RuleFixer} fixer */
						* fix(fixer) {
							yield removeThisFieldAssignment(node, sourceCode, fixer);
							yield fixer.insertTextAfterRange(
								classBodyStartRange,
								`\n${indent}${node.expression.left.property.name} = ${node.expression.right.raw};`,
							);
						},
					};
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Prefer class field declarations over assigning static values in constructor using `this`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: false,
		messages,
	},
};
