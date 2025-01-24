import {isMethodCall, isNewExpression} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';

const MESSAGE_ID_ERROR = 'consistent-date-clone/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unnecessary `.getTime()` call.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	NewExpression(newExpression) {
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

		return {
			node: callExpression,
			loc: {start: callExpression.callee.property.loc.start, end: callExpression.loc.end},
			messageId: MESSAGE_ID_ERROR,
			fix: fixer => removeMethodCall(fixer, callExpression, context.sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer pass `Date` directly to the constructor when cloning a `Date`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
