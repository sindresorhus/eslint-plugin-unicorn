import {
	checkVueTemplate,
	getTokenStore,
	isParenthesized,
} from './utils/index.js';

const MESSAGE_ID = 'require-spread-parentheses';
const messages = {
	[MESSAGE_ID]: 'Wrap the spread argument in parentheses.',
};

const expressionTypes = new Set([
	'AssignmentExpression',
	'BinaryExpression',
	'ConditionalExpression',
	'LogicalExpression',
	'SequenceExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on(['SpreadElement', 'JSXSpreadAttribute'], ({type, argument}) => {
		const shouldCheckArgument = expressionTypes.has(argument.type)
			|| (type === 'SpreadElement' && ['AwaitExpression', 'YieldExpression'].includes(argument.type));

		if (!shouldCheckArgument || isParenthesized(argument, context)) {
			return;
		}

		return {
			node: argument,
			messageId: MESSAGE_ID,
			/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
			* fix(fixer) {
				const spreadToken = getTokenStore(context, argument).getTokenBefore(argument);

				// Keep leading comments inside the parentheses so JSDoc does not become a type assertion.
				yield fixer.insertTextAfter(spreadToken, '(');
				yield fixer.insertTextAfter(argument, ')');
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'layout',
		docs: {
			description: 'Require parentheses around complex spread arguments.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
