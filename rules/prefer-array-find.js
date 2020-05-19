'use strict';
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
		name: 'filter',
		min: 1,
		max: 2,
		property: 'init'
	})
].join('');

const zeroIndexSelector = [
	'MemberExpression',
	'[computed=true]',
	'[property.type="Literal"]',
	'[property.raw="0"]',
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'object'
	})
].join('');

const shiftSelector = [
	methodSelector({
		name: 'shift',
		length: 0
	}),
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'callee.object'
	})
].join('');

const destructuringDeclaratorSelector = [
	'VariableDeclarator',
	'[id.type="ArrayPattern"]',
	'[id.elements.length=1]',
	'[id.elements.0.type!="RestElement"]',
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'init'
	})
].join('');

const destructuringAssignmentSelector = [
	'AssignmentExpression',
	'[left.type="ArrayPattern"]',
	'[left.elements.length=1]',
	'[left.elements.0.type!="RestElement"]',
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'right'
	})
].join('');

// Need add `()` to the `AssignmentExpression`
// - `ObjectExpression`: `[{foo}] = array.filter(bar)` fix to `{foo} = array.find(bar)`
// - `ObjectPattern`: `[{foo = baz}] = array.filter(bar)`
const assignmentNeedParenthesize = ({type}) => type === 'ObjectExpression' || type === 'ObjectPattern';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators#Operator_precedence
// Higher than `??` and `||`
const hasHigherPrecedence = (node, operator) => (
	(node.type === 'LogicalExpression' && node.operator === operator) ||
	// `??` has lower precedence than `||`
	// https://tc39.es/proposal-nullish-coalescing/
	(operator === '??' && node.type === 'LogicalExpression' && node.operator === '||') ||
	node.type === 'ConditionalExpression' ||
	node.type === 'AssignmentExpression' ||
	node.type === 'SequenceExpression'
);

const fixDestructuring = (source, node) => {
	const isAssign = node.type === 'AssignmentExpression';
	const left = isAssign ? node.left : node.id;
	const right = isAssign ? node.right : node.init;

	const [element] = left.elements;

	// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI
	const needParenthesize = isAssign &&
		!isParenthesized(node, source) &&
		assignmentNeedParenthesize(element.type !== 'AssignmentPattern' ? element : element.left);

	if (element.type !== 'AssignmentPattern') {
		return {
			fix: fixer => [
				needParenthesize && fixer.insertTextBefore(node, '('),
				fixer.replaceText(right.callee.property, 'find'),
				fixer.replaceText(left, source.getText(element)),
				needParenthesize && fixer.insertTextAfter(node, ')')
			].filter(Boolean)
		};
	}

	const fix = operator => fixer => {
		const defaultValue = element.right;
		let defaultValueText = source.getText(defaultValue);

		if (isParenthesized(defaultValue, source) || hasHigherPrecedence(defaultValue, operator)) {
			defaultValueText = `(${defaultValueText})`;
		}

		return [
			needParenthesize && fixer.insertTextBefore(node, '('),
			fixer.replaceText(right.callee.property, 'find'),
			fixer.replaceText(left, source.getText(element.left)),
			fixer.insertTextAfter(right, ` ${operator} ${defaultValueText}`),
			needParenthesize && fixer.insertTextAfter(node, ')')
		].filter(Boolean);
	}

	return {
		suggest: [
			{
				messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
				fix: fix('??')
			},
			{
				messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
				fix: fix('||')
			},
		]
	};
};

const isAccessingZeroIndex = node =>
	node.parent &&
	node.parent.type === 'MemberExpression' &&
	node.parent.computed === true &&
	node.parent.property &&
	node.parent.property.type === 'Literal' &&
	node.parent.property.raw === '0';

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
				...fixDestructuring(source, node)
			});
		},
		[destructuringAssignmentSelector](node) {
			context.report({
				node: node.right.callee.property,
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				...fixDestructuring(source, node)
			});
		},
		[filterVariableSelector](node) {
			const variable = findVariable(context.getScope(), node.id);
			const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node.id);

			if (
				identifiers.length === 0 ||
				identifiers.some(identifier => !isAccessingZeroIndex(identifier))
			) {
				return;
			}

			context.report({
				node: node.init.callee.property,
				messageId: MESSAGE_ID_DECLARATION,
				fix: fixer => [
					fixer.replaceText(node.init.callee.property, 'find'),
					...identifiers.map(identifier => fixer.removeRange([identifier.range[1], identifier.parent.range[1]]))
				]
			});
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
