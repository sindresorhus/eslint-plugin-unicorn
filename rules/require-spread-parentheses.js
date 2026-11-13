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
			* fix(fixer, {abort}) {
				const leadingComments = getTokenStore(context, argument).getCommentsBefore(argument);

				// Adding the opening parenthesis can change the line where TypeScript reports an error.
				if (leadingComments.some(comment => /@ts-(?:expect-error|ignore)/u.test(comment.value))) {
					return abort();
				}

				// Keep leading comments inside the parentheses so JSDoc does not become a type assertion.
				yield fixer.insertTextBefore(leadingComments[0] ?? argument, '(');
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
			recommended: true,
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
