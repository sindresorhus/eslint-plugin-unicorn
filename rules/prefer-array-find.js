'use strict';
const {isParenthesized, findVariable} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const renameVariable = require('./utils/rename-variable');
const avoidCapture = require('./utils/avoid-capture');
const getChildScopesRecursive = require('./utils/get-child-scopes-recursive');
const singular = require('./utils/singular');
const extendFixRange = require('./utils/extend-fix-range');

const ERROR_ZERO_INDEX = 'error-zero-index';
const ERROR_SHIFT = 'error-shift';
const ERROR_DESTRUCTURING_DECLARATION = 'error-destructuring-declaration';
const ERROR_DESTRUCTURING_ASSIGNMENT = 'error-destructuring-assignment';
const ERROR_DECLARATION = 'error-variable';
const SUGGESTION_NULLISH_COALESCING_OPERATOR = 'suggest-nullish-coalescing-operator';
const SUGGESTION_LOGICAL_OR_OPERATOR = 'suggest-logical-or-operator';
const messages = {
	[ERROR_DECLARATION]: 'Prefer `.find(…)` over `.filter(…)`.',
	[ERROR_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
	[ERROR_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
	[ERROR_DESTRUCTURING_DECLARATION]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
	// Same message as `ERROR_DESTRUCTURING_DECLARATION`, but different case
	[ERROR_DESTRUCTURING_ASSIGNMENT]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
	[SUGGESTION_NULLISH_COALESCING_OPERATOR]: 'Replace `.filter(…)` with `.find(…) ?? …`.',
	[SUGGESTION_LOGICAL_OR_OPERATOR]: 'Replace `.filter(…)` with `.find(…) || …`.'
};

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
const assignmentNeedParenthesize = (node, sourceCode) => {
	const isAssign = node.type === 'AssignmentExpression';

	if (!isAssign || isParenthesized(node, sourceCode)) {
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
};

function * fixDestructuring(node, sourceCode, fixer) {
	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;

	const leftText = sourceCode.getText(element.type === 'AssignmentPattern' ? element.left : element);
	yield fixer.replaceText(left, leftText);

	// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI
	if (assignmentNeedParenthesize(node, sourceCode)) {
		yield fixer.insertTextBefore(node, '(');
		yield fixer.insertTextAfter(node, ')');
	}
}

const hasDefaultValue = node => getDestructuringLeftAndRight(node).left.elements[0].type === 'AssignmentPattern';

const fixDestructuringDefaultValue = (node, sourceCode, fixer, operator) => {
	const {left, right} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const defaultValue = element.right;
	let defaultValueText = sourceCode.getText(defaultValue);

	if (isParenthesized(defaultValue, sourceCode) || hasLowerPrecedence(defaultValue, operator)) {
		defaultValueText = `(${defaultValueText})`;
	}

	return fixer.insertTextAfter(right, ` ${operator} ${defaultValueText}`);
};

const fixDestructuringAndReplaceFilter = (sourceCode, node) => {
	const {property} = getDestructuringLeftAndRight(node).right.callee;

	let suggest;
	let fix;

	if (hasDefaultValue(node)) {
		suggest = [
			{operator: '??', messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR},
			{operator: '||', messageId: SUGGESTION_LOGICAL_OR_OPERATOR}
		].map(({messageId, operator}) => ({
			messageId,
			* fix(fixer) {
				yield fixer.replaceText(property, 'find');
				yield fixDestructuringDefaultValue(node, sourceCode, fixer, operator);
				yield * fixDestructuring(node, sourceCode, fixer);
			}
		}));
	} else {
		fix = function * (fixer) {
			yield fixer.replaceText(property, 'find');
			yield * fixDestructuring(node, sourceCode, fixer);
		};
	}

	return {fix, suggest};
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
	const sourceCode = context.getSourceCode();

	return {
		[zeroIndexSelector](node) {
			context.report({
				node: node.object.callee.property,
				messageId: ERROR_ZERO_INDEX,
				fix: fixer => [
					fixer.replaceText(node.object.callee.property, 'find'),
					fixer.removeRange([node.object.range[1], node.range[1]])
				]
			});
		},
		[shiftSelector](node) {
			context.report({
				node: node.callee.object.callee.property,
				messageId: ERROR_SHIFT,
				fix: fixer => [
					fixer.replaceText(node.callee.object.callee.property, 'find'),
					fixer.removeRange([node.callee.object.range[1], node.range[1]])
				]
			});
		},
		[destructuringDeclaratorSelector](node) {
			context.report({
				node: node.init.callee.property,
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				...fixDestructuringAndReplaceFilter(sourceCode, node)
			});
		},
		[destructuringAssignmentSelector](node) {
			context.report({
				node: node.right.callee.property,
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				...fixDestructuringAndReplaceFilter(sourceCode, node)
			});
		},
		[filterVariableSelector](node) {
			const scope = context.getScope();
			const variable = findVariable(scope, node.id);
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
				messageId: ERROR_DECLARATION
			};

			// `const [foo = bar] = baz` is not fixable
			if (!destructuringNodes.some(node => hasDefaultValue(node))) {
				problem.fix = function * (fixer) {
					yield fixer.replaceText(node.init.callee.property, 'find');

					const singularName = singular(node.id.name);
					if (singularName) {
						// Rename variable to be singularized now that it refers to a single item in the array instead of the entire array.
						const singularizedName = avoidCapture(singularName, getChildScopesRecursive(scope), context.parserOptions.ecmaVersion);
						yield * renameVariable(variable, singularizedName, fixer);

						// Prevent possible variable conflicts
						yield * extendFixRange(fixer, sourceCode.ast.range);
					}

					for (const node of zeroIndexNodes) {
						yield fixer.removeRange([node.object.range[1], node.range[1]]);
					}

					for (const node of destructuringNodes) {
						yield * fixDestructuring(node, sourceCode, fixer);
					}
				};
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
			description: 'Prefer `.find(…)` over the first element from `.filter(…)`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
