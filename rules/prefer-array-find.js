'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_ZERO_INDEX = 'prefer-array-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-array-find-over-filter-shift';
const MESSAGE_ID_DESTRUCTURING_DECLARATION = 'prefer-array-find-over-filter-destructuring-declaration';
const MESSAGE_ID_DESTRUCTURING_ASSIGNMENT = 'prefer-array-find-over-filter-destructuring-assignment';

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
	'[id.elements.0.type!="AssignmentPattern"]',
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
	'[left.elements.0.type!="AssignmentPattern"]',
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'right'
	})
].join('');

const create = context => {
	return {
		[zeroIndexSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_ZERO_INDEX,
				fix: fixer => [
					fixer.replaceText(node.object.callee.property, 'find'),
					fixer.removeRange([node.object.range[1], node.range[1]])
				]
			});
		},
		[shiftSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_SHIFT,
				fix: fixer => [
					fixer.replaceText(node.callee.object.callee.property, 'find'),
					fixer.removeRange([node.callee.object.range[1], node.range[1]])
				]
			});
		},
		[destructuringDeclaratorSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				fix: fixer => [
					fixer.replaceText(node.init.callee.property, 'find'),
					fixer.replaceText(node.id, context.getSourceCode().getText(node.id.elements[0]))
				]
			});
		},
		[destructuringAssignmentSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				fix: fixer => {
					const assignTarget = node.left.elements[0];
					// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI

					// Need add `()` to the `AssignmentExpression`
					// - `ObjectExpression`: `[{foo}] = array.filter(bar)` fix to `{foo} = array.find(bar)`
					// - `ObjectPattern`: `[{foo = baz}] = array.filter(bar)`
					const needParenthesize = assignTarget.type === 'ObjectExpression' || assignTarget.type === 'ObjectPattern';

					return [
						needParenthesize && fixer.insertTextBefore(node, '('),
						fixer.replaceText(node.right.callee.property, 'find'),
						fixer.replaceText(node.left, context.getSourceCode().getText(assignTarget)),
						needParenthesize && fixer.insertTextAfter(node, ')')
					].filter(Boolean);
				}
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
			[MESSAGE_ID_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
			[MESSAGE_ID_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
			[MESSAGE_ID_DESTRUCTURING_DECLARATION]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
			// Same message as `MESSAGE_ID_DESTRUCTURING_DECLARATION`, but different case
			[MESSAGE_ID_DESTRUCTURING_ASSIGNMENT]: 'Prefer `.find(…)` over destructuring `.filter(…)`.'
		}
	}
};
