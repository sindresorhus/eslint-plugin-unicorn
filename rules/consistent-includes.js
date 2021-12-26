'use strict';
const flatLogicalExpression = require('./utils/flat-logical-expression.js');
const isSameReference = require('./utils/is-same-reference.js');
const {getParentheses} = require('./utils/parentheses.js');

const DEFAULT_MIN_LIST_ITEMS = 2;
const MESSAGE_ID_INCLUDES = 'consistent-includes';
const MESSAGE_ID_LOGICAL_OR = 'consistent-logical-or';
const messages = {
	[MESSAGE_ID_INCLUDES]: 'Use `.includes()`, rather than repeated conditional logical OR (||) operators.',
	[MESSAGE_ID_LOGICAL_OR]: 'Use `{{operator}}`, rather than `.includes()`.',
};

const parseLogicalExpression = node => {
	if (node.parent.operator !== '||') {
		return;
	}

	if (node.type === 'BinaryExpression') {
		const hasTripleEqualsOperator = ['===', '!=='].includes(node.operator);
		if (!hasTripleEqualsOperator) {
			return;
		}

		const {left, right, operator} = node;
		return {left, right, operator};
	}

	let hasNotOperator = false;
	while (node.type === 'UnaryExpression' && node.operator === '!') {
		node = node.argument;
		hasNotOperator = !hasNotOperator;
	}

	if (
		node.type === 'CallExpression'
		&& node.callee.object
		&& node.callee.object.type === 'ArrayExpression'
		&& node.callee.property.name === 'includes'
	) {
		return {
			searchElement: node.arguments[0],
			listValues: node.callee.object.elements,
			operator: hasNotOperator ? '!==' : '===',
		};
	}
};

const parseArrayExpression = node => {
	let hasNotOperator = false;
	node = node.parent.parent;
	while (node.parent.type === 'UnaryExpression') {
		node = node.parent;
		hasNotOperator = !hasNotOperator;
	}

	return {
		nodeWithUnary: node,
		operator: hasNotOperator ? '!==' : '===',
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {minListItems = DEFAULT_MIN_LIST_ITEMS} = context.options[0] || {};
	const arrayIncludesSelector = [
		'CallExpression',
		'[callee.object.type=ArrayExpression]',
		'[callee.property.name=includes]',
		'[callee.object.elements.length!=0]', // Should skip list with 0 items
		`[callee.object.elements.length<${minListItems}]`,
	].join('');
	return {
		* ':not(LogicalExpression) > LogicalExpression'(node) {
			let repetitiveReference;
			let comparedValues = [];

			const add = (ref, ...compareValues) => {
				repetitiveReference = ref;
				comparedValues.push(...compareValues);
			};

			const canBreakLoop = () => {
				if (minListItems > comparedValues.length) {
					repetitiveReference = undefined;
					comparedValues = [];
					return false;
				}

				return true;
			};

			/* Nodes will contain at least 2 expressions */
			const nodes = flatLogicalExpression(node, false);

			for (let i = 1; i < nodes.length; i += 1) {
				const previous = parseLogicalExpression(nodes[i - 1]);
				const current = parseLogicalExpression(nodes[i]);
				if (!previous || !current || (previous.operator !== current.operator)) {
					if (repetitiveReference && canBreakLoop()) {
						break;
					} else {
						continue;
					}
				}

				if (!repetitiveReference) {
					if (previous.searchElement && current.searchElement) { // Array || Array
						if (isSameReference(previous.searchElement, current.searchElement)) {
							add(previous.searchElement, ...previous.listValues, ...current.listValues);
						}
					} else if (previous.searchElement) {
						if (isSameReference(previous.searchElement, current.left)) { // Array || Binary
							add(previous.searchElement, ...previous.listValues, current.right);
						} else if (isSameReference(previous.searchElement, current.right)) { // Array || Flipped binary
							add(previous.searchElement, ...previous.listValues, current.left);
						}
					} else if (current.searchElement) {
						if (isSameReference(previous.left, current.searchElement)) { // Binary || Array
							add(previous.left, previous.right, ...current.listValues);
						} else if (isSameReference(previous.right, current.searchElement)) { // Flipped binary || Array
							add(previous.right, previous.left, ...current.listValues);
						}
					} else if (isSameReference(previous.left, current.left)) { // Binary || Binary
						add(previous.left, previous.right, current.right);
					} else if (isSameReference(previous.left, current.right)) { // Binary || Flipped binary
						add(previous.left, previous.right, current.left);
					} else if (isSameReference(previous.right, current.left)) { // Flipped binary || Binary
						add(previous.right, previous.left, current.right);
					} else if (isSameReference(previous.right, current.right)) { // Flipped binary || Flipped binary
						add(previous.right, previous.left, current.left);
					}

					continue;
				}

				// If repetitiveReference exists
				if (current.searchElement) {
					if (isSameReference(repetitiveReference, current.searchElement)) {
						comparedValues.push(...current.listValues);
					} else if (canBreakLoop()) {
						break;
					}
				} else if (isSameReference(repetitiveReference, current.left)) {
					comparedValues.push(current.right);
				} else if (isSameReference(repetitiveReference, current.right)) {
					comparedValues.push(current.left);
				} else if (canBreakLoop()) {
					break;
				}
			}

			if (comparedValues.length >= minListItems) {
				let from = comparedValues[0].parent;
				let hasNotOperator = false;
				if (from.type === 'ArrayExpression') {
					const {nodeWithUnary, operator} = parseArrayExpression(from);
					from = nodeWithUnary;
					hasNotOperator = operator === '!==';
				} else if (from.type === 'BinaryExpression' && from.operator === '!==') {
					hasNotOperator = true;
				}

				let to = comparedValues[comparedValues.length - 1].parent;
				if (to.type === 'ArrayExpression') {
					to = to.parent.parent;
				}

				yield {
					messageId: MESSAGE_ID_INCLUDES,
					loc: {
						start: from.loc.start,
						end: to.loc.end,
					},
					fix(fixer) {
						const sourceCode = context.getSourceCode();
						const lastBlockNode = sourceCode.getNodeByRangeIndex(from.end);
						const parenthesesRange = getParentheses(lastBlockNode, sourceCode);
						const range = parenthesesRange.length > 0 ? [parenthesesRange[0].start, parenthesesRange[parenthesesRange.length - 1].end] : [from.start, to.end];

						const values = comparedValues.map(node => sourceCode.getText(node)).join(', ');
						const searchElement = sourceCode.getText(repetitiveReference);
						const newText = `${hasNotOperator ? '!' : ''}[${values}].includes(${searchElement})`;

						return fixer.replaceTextRange(range, newText);
					},
				};
			}
		},
		* [arrayIncludesSelector](node) {
			const arrayExpressionNode = node.callee.object;
			const {nodeWithUnary, operator} = parseArrayExpression(arrayExpressionNode);
			yield {
				messageId: MESSAGE_ID_LOGICAL_OR,
				data: {operator},
				node: nodeWithUnary,
				fix(fixer) {
					const sourceCode = context.getSourceCode();
					const searchElement = sourceCode.getText(node.arguments[0]);
					const logicalExpressions = arrayExpressionNode.elements.map(element => `${searchElement} ${operator} ${sourceCode.getText(element)}`);
					const newText = logicalExpressions.join(' || ');
					return fixer.replaceTextRange(nodeWithUnary.range, logicalExpressions.length > 1 ? `(${newText})` : newText);
				},
			};
		},
	};
};

const schema = {
	type: 'array',
	maxItems: 1,
	items: {
		type: 'object',
		additionalProperties: false,
		required: ['minListItems'],
		properties: {
			minListItems: {
				type: 'integer',
				minimum: 2,
				default: DEFAULT_MIN_LIST_ITEMS,
			},
		},
	},
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Use `.includes()`, rather than repeated conditional logical OR (`||`) operators.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
