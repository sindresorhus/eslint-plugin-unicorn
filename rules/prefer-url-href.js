import {isCallExpression, isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isGlobalIdentifier,
	isUrl,
	isFreshUrl,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-url-href';
const messages = {
	[MESSAGE_ID]: 'Prefer `URL#href` over stringifying a `URL`.',
};

const canFix = (node, context) => context.sourceCode.getCommentsInside(node).length === 0;

const getHrefText = (node, context) => {
	const nodeText = getParenthesizedText(node, context);
	const objectText = !isParenthesized(node, context) && shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${nodeText})` : nodeText;
	const text = `${objectText}.href`;
	const semicolon = needsSemicolon(context.sourceCode.getTokenBefore(node.parent), context, text) ? ';' : '';
	return semicolon + text;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			isMethodCall(callExpression, {
				method: 'toString',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			&& isUrl(callExpression.callee.object, context)
		) {
			const problem = {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID,
			};

			if (
				canFix(callExpression, context)
				&& !isParenthesized(callExpression.callee, context)
				&& isFreshUrl(callExpression.callee.object, context)
			) {
				problem.fix = fixer => fixer.replaceTextRange(
					[
						context.sourceCode.getRange(callExpression.callee.property)[0],
						context.sourceCode.getRange(callExpression)[1],
					],
					'href',
				);
			}

			return problem;
		}

		if (!(
			isCallExpression(callExpression, {
				name: 'String',
				argumentsLength: 1,
				optional: false,
			})
			&& isGlobalIdentifier(callExpression.callee, context)
		)) {
			return;
		}

		const [argument] = callExpression.arguments;
		if (!isUrl(argument, context)) {
			return;
		}

		const problem = {
			node: callExpression.callee,
			messageId: MESSAGE_ID,
		};

		if (
			canFix(callExpression, context)
			&& isFreshUrl(argument, context)
		) {
			problem.fix = fixer => fixer.replaceText(callExpression, getHrefText(argument, context));
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
			description: 'Prefer `URL#href` over stringifying a `URL`.',
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
