import {isLazyIteratorHelperCall} from './shared/iterator-helpers.js';
import {isTypeScriptExpressionWrapper} from './utils/index.js';

const MESSAGE_ID = 'no-unused-iterator-helper';
const MESSAGE_ID_SUGGESTION = 'no-unused-iterator-helper/suggestion';
const messages = {
	[MESSAGE_ID]: 'Consume the iterator returned by `.{{method}}(…)`; iterator helpers are lazy.',
	[MESSAGE_ID_SUGGESTION]: 'Use `.forEach()` to run the callback.',
};

const getDiscardedExpression = node => {
	while (
		isTypeScriptExpressionWrapper(node.parent)
		|| node.parent.type === 'AwaitExpression'
		|| node.parent.type === 'ParenthesizedExpression'
		|| node.parent.type === 'ChainExpression'
	) {
		node = node.parent;
	}

	const {parent} = node;
	if (
		parent.type === 'ExpressionStatement'
		|| (parent.type === 'UnaryExpression' && parent.operator === 'void')
		|| (parent.type === 'ForStatement' && (parent.init === node || parent.update === node))
	) {
		return node;
	}
};

const canSuggestForEach = (node, discardedExpression) => {
	if (
		node.callee.property.name !== 'map'
		|| node.arguments.length !== 1
		|| node.arguments[0].type === 'SpreadElement'
		|| node.typeArguments
		|| node.typeParameters
	) {
		return false;
	}

	// Renaming map to forEach changes the result type to void, which may invalidate an assertion on that result.
	for (let expression = node; expression !== discardedExpression.parent; expression = expression.parent) {
		if (isTypeScriptExpressionWrapper(expression)) {
			return false;
		}
	}

	return true;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		const discardedExpression = getDiscardedExpression(node);
		if (!discardedExpression || !isLazyIteratorHelperCall(node, context)) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {method: node.callee.property.name},
		};

		if (canSuggestForEach(node, discardedExpression)) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(node.callee.property, 'forEach'),
				},
			];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow discarding lazy iterator helpers.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
