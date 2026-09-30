import {isMethodCall, isNewExpression} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';
import {getParenthesizedRange, wouldRemoveComments} from './utils/index.js';

const MESSAGE_ID_ERROR = 'consistent-date-clone/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unnecessary `.getTime()` call.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', newExpression => {
		if (!isNewExpression(newExpression, {name: 'Date', argumentsLength: 1})) {
			return;
		}

		const [callExpression] = newExpression.arguments;

		if (!isMethodCall(callExpression, {
			method: 'getTime',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {sourceCode} = context;
		const problem = {
			node: callExpression,
			loc: {
				start: sourceCode.getLoc(callExpression.callee.property).start,
				end: sourceCode.getLoc(callExpression).end,
			},
			messageId: MESSAGE_ID_ERROR,
		};

		// `removeMethodCall()` removes everything after the object, so a comment there would be lost
		if (!wouldRemoveComments(context, callExpression, [getParenthesizedRange(callExpression.callee.object, context)])) {
			problem.fix = fixer => removeMethodCall(fixer, callExpression, context);
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
			description: 'Prefer passing `Date` directly to the constructor when cloning.',
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
