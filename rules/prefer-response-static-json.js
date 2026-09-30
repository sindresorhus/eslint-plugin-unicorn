import {
	isNewExpression,
	isMethodCall,
} from './ast/index.js';
import {
	switchNewExpressionToCallExpression,
} from './fix/index.js';
import {
	getParenthesizedRange,
	hasCommentInRange,
	isParenthesized,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-response-static-json';
const messages = {
	[MESSAGE_ID]: 'Prefer using `Response.json(…)` over `JSON.stringify()`.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', newExpression => {
		if (!isNewExpression(newExpression, {name: 'Response', minimumArguments: 1})) {
			return;
		}

		const [jsonStringifyNode] = newExpression.arguments;
		if (!isMethodCall(jsonStringifyNode, {
			object: 'JSON',
			method: 'stringify',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [dataNode] = jsonStringifyNode.arguments;
		const callExpressionRange = getParenthesizedRange(jsonStringifyNode, context);
		const dataNodeRange = getParenthesizedRange(dataNode, context);
		// `(( JSON.stringify( (( data )), ) ))`
		//  ^^^^^^^^^^^^^^^^^^^
		const removedRangeBefore = [callExpressionRange[0], dataNodeRange[0]];
		// `(( JSON.stringify( (( data )), ) ))`
		//                               ^^^^^^
		const removedRangeAfter = [dataNodeRange[1], callExpressionRange[1]];

		const problem = {
			node: jsonStringifyNode.callee,
			messageId: MESSAGE_ID,
		};

		// A comment in the removed part of the `JSON.stringify()` call would be dropped
		if (
			hasCommentInRange(context, removedRangeBefore)
			|| hasCommentInRange(context, removedRangeAfter)
		) {
			return problem;
		}

		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		problem.fix = function * (fixer) {
			yield fixer.insertTextAfter(newExpression.callee, '.json');
			yield switchNewExpressionToCallExpression(newExpression, context, fixer);
			yield fixer.removeRange(removedRangeBefore);
			yield fixer.removeRange(removedRangeAfter);

			if (
				!isParenthesized(newExpression, context)
				&& isParenthesized(newExpression.callee, context)
				&& needsSemicolon(context.sourceCode.getTokenBefore(newExpression), context, '(')
			) {
				yield fixer.insertTextBefore(newExpression, ';');
			}
		};

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
			description: 'Prefer `Response.json()` over `new Response(JSON.stringify())`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',

		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
