import {
	checkVueTemplate,
	getTokenStore,
	isKnownNonArray,
	isOnSameLine,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToUnaryExpressionArgument,
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

const predicateBodyTypesRequiringParentheses = new Set([
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

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

	if (callback.type === 'ArrowFunctionExpression' && callback.body.type !== 'BlockStatement') {
		return callback.body;
	}

	if (
		callback.body.type === 'BlockStatement'
		&& callback.body.body.length === 1
		&& callback.body.body[0].type === 'ReturnStatement'
	) {
		return callback.body.body[0].argument;
	}
}

function getReplacementPredicateText(node, context) {
	if (isNegatedExpression(node)) {
		const text = context.sourceCode.getText(node.argument);

		return {
			node,
			text: needsParenthesesInConciseArrowBody(node, text) ? `(${text})` : text,
		};
	}

	const text = context.sourceCode.getText(node);
	const needsParentheses = predicateBodyTypesRequiringParentheses.has(node.type) || shouldAddParenthesesToUnaryExpressionArgument(node, '!');

	return {
		node,
		text: needsParentheses ? `!(${text})` : `!${text}`,
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('UnaryExpression', unaryExpression => {
		if (!isNegatedExpression(unaryExpression)) {
			return;
		}

		const {argument: callExpression} = unaryExpression;
		const tokenStore = getTokenStore(context, unaryExpression);
		const bangToken = tokenStore.getFirstToken(unaryExpression);
		if (!bangToken) {
			return;
		}

		const tokenAfterBang = tokenStore.getTokenAfter(bangToken);
		if (tokenStore.getTokenAfter(bangToken, {includeComments: true}) !== tokenAfterBang) {
			return;
		}

		if (!isMethodCall(callExpression, {
			methods,
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		if (
			callExpression.typeArguments
			|| callExpression.typeParameters
			|| isKnownNonArray(callExpression.callee.object, context)
		) {
			return;
		}

		const [callback] = callExpression.arguments;
		if (!isFunction(callback)) {
			return;
		}

		const returnedExpression = getReturnedExpression(callback);
		if (
			!returnedExpression
			|| sourceCode.getCommentsInside(returnedExpression).length > 0
		) {
			return;
		}

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
		const {node: replacementPredicateNode, text: replacementPredicateText} = getReplacementPredicateText(returnedExpression, context);

		return {
			node: methodNode,
			messageId: MESSAGE_ID,
			data: {
				method,
				replacement,
			},
			* fix(fixer) {
				const needsReturnOrThrowParentheses = (
					(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
					&& parent.argument === unaryExpression
					&& !isOnSameLine(bangToken, tokenAfterBang, context)
					&& !isParenthesized(unaryExpression, context)
				);

				yield fixer.remove(bangToken);
				yield fixer.replaceText(methodNode, replacement);
				yield fixer.replaceText(replacementPredicateNode, replacementPredicateText);

				if (
					tokenStore === sourceCode
					&& !needsReturnOrThrowParentheses
				) {
					yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
				}

				if (needsReturnOrThrowParentheses) {
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

/** @type {import('eslint').Rule.RuleModule} */
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
