import {isFunction, isMethodCall} from './ast/index.js';
import {removeSpacesAfter} from './fix/index.js';

const MESSAGE_ID_ERROR = 'no-await-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION = 'no-await-in-promise-methods/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Promise in `Promise.{{method}}()` should not be awaited.',
	[MESSAGE_ID_SUGGESTION]: 'Remove `await`.',
};
const METHODS = ['all', 'allSettled', 'any', 'race'];

const isPromiseMethodCallWithArrayExpression = node =>
	isMethodCall(node, {
		object: 'Promise',
		methods: METHODS,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression';

// Get the `Promise` method array element that contains the `await` expression
const getPromiseMethodArrayElement = awaitExpression => {
	for (let node = awaitExpression; node.parent; node = node.parent) {
		const {parent} = node;

		// The `await` belongs to a nested function, or the outer `await` is reported instead
		if (isFunction(parent) || parent.type === 'AwaitExpression') {
			return;
		}

		if (
			parent.type === 'ArrayExpression'
			&& isPromiseMethodCallWithArrayExpression(parent.parent)
		) {
			return node;
		}
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('AwaitExpression', awaitExpression => {
		const element = getPromiseMethodArrayElement(awaitExpression);
		if (!element) {
			return;
		}

		const problem = {
			node: awaitExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: element.parent.parent.callee.property.name,
			},
		};

		// Only suggest removing `await` when it is the element itself
		if (element === awaitExpression) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					* fix(fixer) {
						const awaitToken = context.sourceCode.getFirstToken(awaitExpression);
						yield fixer.remove(awaitToken);
						yield removeSpacesAfter(awaitToken, context, fixer);
					},
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
		type: 'suggestion',
		docs: {
			description: 'Disallow using `await` in `Promise` method parameters.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
