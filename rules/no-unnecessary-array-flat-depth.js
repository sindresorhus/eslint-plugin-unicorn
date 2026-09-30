import {isMethodCall, isLiteral} from './ast/index.js';
import {removeArgument} from './fix/index.js';
import {
	getCallExpressionTokens,
	hasCommentInRange,
	shouldSkipKnownNonArrayReceiver,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-array-flat-depth';
const messages = {
	[MESSAGE_ID]: 'Passing `1` as the `depth` argument is unnecessary.',
};

// `flat()` already defaults to a depth of `1`, so the whole argument list goes. Removing only the argument would leave the whitespace it was written with behind, as in `foo.flat(\n\t1,\n)`.
const getFix = (callExpression, numberOne, context) => fixer => {
	const {sourceCode} = context;
	const {openingParenthesisToken, closingParenthesisToken} = getCallExpressionTokens(callExpression, context);
	const [start] = sourceCode.getRange(openingParenthesisToken);
	const [, end] = sourceCode.getRange(closingParenthesisToken);

	// A comment in the argument list has to stay, so only the argument goes then
	return hasCommentInRange(context, [start, end])
		? removeArgument(fixer, numberOne, context)
		: fixer.replaceTextRange([start, end], '()');
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!(
			isMethodCall(callExpression, {
				method: 'flat',
				argumentsLength: 1,
				optionalCall: false,
			})
			&& isLiteral(callExpression.arguments[0], 1)
		)) {
			return;
		}

		if (shouldSkipKnownNonArrayReceiver(callExpression.callee.object, context)) {
			return;
		}

		const [numberOne] = callExpression.arguments;

		return {
			node: numberOne,
			messageId: MESSAGE_ID,
			fix: getFix(callExpression, numberOne, context),
		};
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
			description: 'Disallow using `1` as the `depth` argument of `Array#flat()`.',
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
