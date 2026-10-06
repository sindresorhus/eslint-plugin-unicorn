import {
	checkVueTemplate,
	getFunctionReturnExpression,
	getNegatedExpressionText,
	getParenthesizedRange,
	getTokenStore,
	hasTypeArguments,
	isKnownNonIndexedCollection,
	isOnSameLine,
	isParenthesized,
	needsSemicolon,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	addParenthesesToReturnOrThrowExpression,
	fixSpaceAroundKeyword,
} from './fix/index.js';
import {isFunction, isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-negated-array-predicate';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array#{{replacement}}()` with a negated predicate over negating `Array#{{method}}()`.',
};

const replacementMethod = new Map([
	['every', 'some'],
	['some', 'every'],
]);
const methods = replacementMethod.keys().toArray();

const needsParenthesesInConciseArrowBody = (node, text) =>
	node.parent.type === 'ArrowFunctionExpression'
	&& node.parent.body === node
	&& (
		node.argument.type === 'SequenceExpression'
		|| text.trimStart().startsWith('{')
	);

const isNegatedExpression = node => node.type === 'UnaryExpression' && node.operator === '!' && node.prefix;

function getReturnedExpression(callback) {
	if (
		callback.async
		|| callback.generator
		|| callback.returnType
		|| callback.typeParameters
	) {
		return;
	}

	return getFunctionReturnExpression(callback);
}

function getReplacementPredicate(node, context) {
	if (isNegatedExpression(node)) {
		const text = context.sourceCode.getText(node.argument);

		return {
			replacedRange: context.sourceCode.getRange(node),
			text: needsParenthesesInConciseArrowBody(node, text) ? `(${text})` : text,
		};
	}

	return {
		replacedRange: getParenthesizedRange(node, context),
		text: getNegatedExpressionText(node, context),
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('UnaryExpression', unaryExpression => {
		if (!isNegatedExpression(unaryExpression)) {
			return;
		}

		// `!foo.every(…)!` puts the `!` inside the non-null assertion
		const callExpression = unwrapTypeScriptExpression(unaryExpression.argument);

		if (!isMethodCall(callExpression, {
			methods,
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		if (hasTypeArguments(callExpression)) {
			return;
		}

		const [callback] = callExpression.arguments;
		if (!isFunction(callback)) {
			return;
		}

		const returnedExpression = getReturnedExpression(callback);
		if (
			!returnedExpression
			// Resolving the receiver type is expensive, so it runs last
			|| isKnownNonIndexedCollection(callExpression.callee.object, context)
		) {
			return;
		}

		const tokenStore = getTokenStore(context, unaryExpression);
		const bangToken = tokenStore.getFirstToken(unaryExpression);
		const tokenAfterBang = tokenStore.getTokenAfter(bangToken);
		const {parent} = unaryExpression;
		if (
			parent.type === 'YieldExpression'
			&& parent.argument === unaryExpression
			&& !isOnSameLine(bangToken, tokenAfterBang, context)
			&& !isParenthesized(unaryExpression, context)
		) {
			return;
		}

		const methodNode = callExpression.callee.property;
		const method = methodNode.name;
		const replacement = replacementMethod.get(method);
		const {replacedRange: replacementPredicateRange, text: replacementPredicateText} = getReplacementPredicate(returnedExpression, context);

		return {
			node: methodNode,
			messageId: MESSAGE_ID,
			data: {
				method,
				replacement,
			},
			* fix(fixer, {abort}) {
				// Vue template comments are unavailable to the source-text helpers, including comments inside surrounding parentheses.
				const predicateNode = tokenStore === sourceCode ? returnedExpression : callback;
				const [predicateStart, predicateEnd] = replacementPredicateRange;
				if (
					tokenStore.getTokensBetween(bangToken, tokenAfterBang, {includeComments: true}).length > 0
					|| tokenStore.getCommentsInside(predicateNode).some(comment => {
						const [commentStart, commentEnd] = sourceCode.getRange(comment);
						return commentStart >= predicateStart && commentEnd <= predicateEnd;
					})
				) {
					return abort();
				}

				const isNeedsReturnOrThrowParentheses = (
					(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
					&& parent.argument === unaryExpression
					&& !isOnSameLine(bangToken, tokenAfterBang, context)
					&& !isParenthesized(unaryExpression, context)
				);

				yield fixer.remove(bangToken);
				yield fixer.replaceText(methodNode, replacement);
				yield fixer.replaceTextRange(replacementPredicateRange, replacementPredicateText);

				if (
					tokenStore === sourceCode
					&& !isNeedsReturnOrThrowParentheses
				) {
					yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
				}

				if (isNeedsReturnOrThrowParentheses) {
					yield addParenthesesToReturnOrThrowExpression(fixer, parent, context);
					return;
				}

				if (tokenStore === sourceCode) {
					const tokenBefore = sourceCode.getTokenBefore(unaryExpression);
					if (needsSemicolon(tokenBefore, context, tokenAfterBang.value)) {
						yield fixer.insertTextBefore(unaryExpression, ';');
					}
				}
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
		type: 'suggestion',
		docs: {
			description: 'Disallow negated array predicate calls.',
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
