'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_ZERO_INDEX = 'prefer-array-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-array-find-over-filter-shift';
const MESSAGE_ID_DESTRUCTURING = 'prefer-array-find-over-filter-destructuring';

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

const destructuringSelector = [
	'VariableDeclarator',
	'[id.type="ArrayPattern"]',
	'[id.elements.length=1]',
	'[id.elements.0.type="Identifier"]',
	methodSelector({
		name: 'filter',
		min: 1,
		max: 2,
		property: 'init'
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
		[destructuringSelector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID_DESTRUCTURING,
				fix: fixer => [
					fixer.replaceText(node.init.callee.property, 'find'),
					fixer.replaceText(node.id, context.getSourceCode().getText(node.id.elements[0]))
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
			[MESSAGE_ID_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
			[MESSAGE_ID_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
			[MESSAGE_ID_DESTRUCTURING]: 'Prefer `.find(…)` over destructuring `.filter(…)`.'
		}
	}
};
