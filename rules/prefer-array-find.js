'use strict';
const {flatten} = require('lodash');
const {isParenthesized, findVariable} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');

const MESSAGE_ID_ZERO_INDEX = 'prefer-array-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-array-find-over-filter-shift';
const MESSAGE_ID_DESTRUCTURING_DECLARATION = 'prefer-array-find-over-filter-destructuring-declaration';
const MESSAGE_ID_DESTRUCTURING_ASSIGNMENT = 'prefer-array-find-over-filter-destructuring-assignment';
const MESSAGE_ID_DECLARATION = 'prefer-array-find-over-filter';

const MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR = 'use-nullish-coalescing-operator';
const MESSAGE_ID_USE_LOGICAL_OR_OPERATOR = 'use-logical-or-operator';

const filterMethodSelectorOptions = {
	name: 'filter',
	min: 1,
	max: 2
};

const filterVariableSelector = [
	'VariableDeclaration',
	// Exclude `export const foo = [];`
	`:not(${
		[
			'ExportNamedDeclaration',
			'>',
			'VariableDeclaration.declaration'
		].join('')
	})`,
	'>',
	'VariableDeclarator.declarations',
	'[id.type="Identifier"]',
	methodSelector({
		...filterMethodSelectorOptions,
		property: 'init'
	})
].join('');

const zeroIndexSelector = [
	'MemberExpression',
	'[computed=true]',
	'[property.type="Literal"]',
	'[property.raw="0"]',
	methodSelector({
		...filterMethodSelectorOptions,
		property: 'object'
	})
].join('');

const shiftSelector = [
	methodSelector({
		name: 'shift',
		length: 0
	}),
	methodSelector({
		...filterMethodSelectorOptions,
		property: 'callee.object'
	})
].join('');

const destructuringDeclaratorSelector = [
	'VariableDeclarator',
	'[id.type="ArrayPattern"]',
	'[id.elements.length=1]',
	'[id.elements.0.type!="RestElement"]',
	methodSelector({
		...filterMethodSelectorOptions,
		property: 'init'
	})
].join('');

const destructuringAssignmentSelector = [
	'AssignmentExpression',
	'[left.type="ArrayPattern"]',
	'[left.elements.length=1]',
	'[left.elements.0.type!="RestElement"]',
	methodSelector({
		...filterMethodSelectorOptions,
		property: 'right'
	})
].join('');

// Need add `()` to the `AssignmentExpression`
// - `ObjectExpression`: `[{foo}] = array.filter(bar)` fix to `{foo} = array.find(bar)`
// - `ObjectPattern`: `[{foo = baz}] = array.filter(bar)`
const assignmentNeedParenthesize = (node, source) => {
	const isAssign = node.type === 'AssignmentExpression';

	if (!isAssign || isParenthesized(node, source)) {
		return false;
	}

	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const {type} = element.type === 'AssignmentPattern' ? element.left : element;
	return type === 'ObjectExpression' || type === 'ObjectPattern';
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
const hasLowerPrecedence = (node, operator) => (
	(node.type === 'LogicalExpression' && (
		node.operator === operator ||
		// https://tc39.es/proposal-nullish-coalescing/ says
		// `??` has lower precedence than `||`
		// But MDN says
		// `??` has higher precedence than `||`
		(operator === '||' && node.operator === '??') ||
		(operator === '??' && (node.operator === '||' || node.operator === '&&'))
	)) ||
	node.type === 'ConditionalExpression' ||
	// Lower than `assignment`, should already parenthesized
	/* istanbul ignore next */
	node.type === 'AssignmentExpression' ||
	node.type === 'YieldExpression' ||
	node.type === 'SequenceExpression'
);

const getDestructuringLeftAndRight = node => {
	/* istanbul ignore next */
	if (!node) {
		return {};
	}

	if (node.type === 'AssignmentExpression') {
		return node;
	}

	if (node.type === 'VariableDeclarator') {
		return {left: node.id, right: node.init};
	}

	return {};
}

const fixDestructuring = (node, source, fixer) => {
	const isAssign = node.type === 'AssignmentExpression';
	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const needParenthesize = assignmentNeedParenthesize(node, source);

	return [
		needParenthesize && fixer.insertTextBefore(node, '('),
		fixer.replaceText(left, source.getText(element)),
		needParenthesize && fixer.insertTextAfter(node, ')')
	].filter(Boolean);
};

const fixDestructuringAndReplaceFilter = (source, node) => {
	const isAssign = node.type === 'AssignmentExpression';
	const {left, right} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;

	// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI
	const needParenthesize = assignmentNeedParenthesize(node, source);

	if (element.type !== 'AssignmentPattern') {
		return {
			fix: fixer => [
				fixer.replaceText(right.callee.property, 'find'),
				...fixDestructuring(node, source, fixer)
			]
		};
	}

	const fix = operator => fixer => {
		const defaultValue = element.right;
		let defaultValueText = source.getText(defaultValue);

		if (isParenthesized(defaultValue, source) || hasLowerPrecedence(defaultValue, operator)) {
			defaultValueText = `(${defaultValueText})`;
		}

		return [
			needParenthesize && fixer.insertTextBefore(node, '('),
			fixer.replaceText(right.callee.property, 'find'),
			fixer.replaceText(left, source.getText(element.left)),
			fixer.insertTextAfter(right, ` ${operator} ${defaultValueText}`),
			needParenthesize && fixer.insertTextAfter(node, ')')
		].filter(Boolean);
	};

	return {
		suggest: [
			{
				messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
				fix: fix('??')
			},
			{
				messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
				fix: fix('||')
			}
		]
	};
};

const isAccessingZeroIndex = node =>
	node.parent &&
	node.parent.type === 'MemberExpression' &&
	node.parent.computed === true &&
	node.parent.object === node &&
	node.parent.property &&
	node.parent.property.type === 'Literal' &&
	node.parent.property.raw === '0';

const isDestructuringFirstElement = node => {
	const {left, right} = getDestructuringLeftAndRight(node.parent);
	return left &&
		right &&
		right === node &&
		left.type === 'ArrayPattern' &&
		left.elements &&
		left.elements.length === 1 &&
		left.elements[0].type !== 'RestElement';
};

const create = context => {
	const source = context.getSourceCode();

	return {
		[zeroIndexSelector](node) {
			context.report({
				node: node.object.callee.property,
				messageId: MESSAGE_ID_ZERO_INDEX,
				fix: fixer => [
					fixer.replaceText(node.object.callee.property, 'find'),
					fixer.removeRange([node.object.range[1], node.range[1]])
				]
			});
		},
		[shiftSelector](node) {
			context.report({
				node: node.callee.object.callee.property,
				messageId: MESSAGE_ID_SHIFT,
				fix: fixer => [
					fixer.replaceText(node.callee.object.callee.property, 'find'),
					fixer.removeRange([node.callee.object.range[1], node.range[1]])
				]
			});
		},
		[destructuringDeclaratorSelector](node) {
			context.report({
				node: node.init.callee.property,
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				...fixDestructuringAndReplaceFilter(source, node)
			});
		},
		[destructuringAssignmentSelector](node) {
			context.report({
				node: node.right.callee.property,
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				...fixDestructuringAndReplaceFilter(source, node)
			});
		},
		[filterVariableSelector](node) {
			const variable = findVariable(context.getScope(), node.id);
			const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node.id);

			if (identifiers.length === 0) {
				return;
			}

			const zeroIndexNodes = [];
			const destructuringNodes = [];
			for (const identifier of identifiers) {
				if (isAccessingZeroIndex(identifier)) {
					zeroIndexNodes.push(identifier.parent);
				} else if (isDestructuringFirstElement(identifier)) {
					destructuringNodes.push(identifier.parent);
				} else {
					return;
				}
			}

			const problem = {
				node: node.init.callee.property,
				messageId: MESSAGE_ID_DECLARATION
			};

			// `const [foo = bar] = baz` is not fixable
			if (
				!destructuringNodes.some(node => getDestructuringLeftAndRight(node).left.elements[0].type === 'AssignmentPattern')
			) {
				problem.fix = fixer => [
					fixer.replaceText(node.init.callee.property, 'find'),
					...zeroIndexNodes.map(node => fixer.removeRange([node.object.range[1], node.range[1]])),
					...flatten(destructuringNodes.map(node => fixDestructuring(node, source, fixer)))
				];
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID_DECLARATION]: 'Prefer `.find(…)` over `.filter(…)`.',
			[MESSAGE_ID_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
			[MESSAGE_ID_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
			[MESSAGE_ID_DESTRUCTURING_DECLARATION]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
			// Same message as `MESSAGE_ID_DESTRUCTURING_DECLARATION`, but different case
			[MESSAGE_ID_DESTRUCTURING_ASSIGNMENT]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
			[MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR]: 'Replace `.filter(…)` with `.find(…) ?? …`.',
			[MESSAGE_ID_USE_LOGICAL_OR_OPERATOR]: 'Replace `.filter(…)` with `.find(…) || …`.'
		}
	}
};
