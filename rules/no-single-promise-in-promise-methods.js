import {isCommaToken} from '@eslint-community/eslint-utils';
import {isExpressionStatement, isLiteral, isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToAwaitExpressionArgument,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-single-promise-in-promise-methods/error';
const MESSAGE_ID_SUGGESTION_UNWRAP = 'no-single-promise-in-promise-methods/unwrap';
const MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE = 'no-single-promise-in-promise-methods/use-promise-resolve';
const messages = {
	[MESSAGE_ID_ERROR]: 'Wrapping single-element array with `Promise.{{method}}()` is unnecessary.',
	[MESSAGE_ID_SUGGESTION_UNWRAP]: 'Use the value directly.',
	[MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE]: 'Switch to `Promise.resolve(…)`.',
};
const METHODS = ['all', 'any', 'race'];

const isPromiseMethodCallWithSingleElementArray = node =>
	isMethodCall(node, {
		object: 'Promise',
		methods: METHODS,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression'
	&& node.arguments[0].elements.length === 1
	&& node.arguments[0].elements[0]
	&& node.arguments[0].elements[0].type !== 'SpreadElement';

const getAwaitedPromiseText = (callExpression, context) => {
	const [promiseNode] = callExpression.arguments[0].elements;
	let text = getParenthesizedText(promiseNode, context);

	if (
		!isParenthesized(promiseNode, context)
		&& shouldAddParenthesesToAwaitExpressionArgument(promiseNode)
	) {
		text = `(${text})`;
	}

	return text;
};

// The next node is already behind a `CallExpression`, there should be no ASI problem
const unwrapAwaitedCallExpression = (callExpression, context) => fixer => fixer.replaceText(callExpression, getAwaitedPromiseText(callExpression, context));

const unwrapNonAwaitedCallExpression = (callExpression, context) => fixer => {
	const [promiseNode] = callExpression.arguments[0].elements;
	let text = getParenthesizedText(promiseNode, context);

	if (
		!isParenthesized(promiseNode, context)
		// Since the original call expression can be anywhere, it's hard to tell if the promise
		// need to be parenthesized, but it's safe to add parentheses
		&& !(
			// Known cases that not need parentheses
			promiseNode.type === 'Identifier'
			|| promiseNode.type === 'MemberExpression'
		)
	) {
		text = `(${text})`;
	}

	const previousToken = context.sourceCode.getTokenBefore(callExpression);
	if (needsSemicolon(previousToken, context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(callExpression, text);
};

const switchToPromiseResolve = (callExpression, sourceCode) => function * (fixer) {
	/*
	```
	Promise.race([promise,])
	//      ^^^^ methodNameNode
	```
	*/
	const methodNameNode = callExpression.callee.property;
	yield fixer.replaceText(methodNameNode, 'resolve');

	const [arrayExpression] = callExpression.arguments;
	/*
	```
	Promise.race([promise,])
	//           ^ openingBracketToken
	```
	*/
	const openingBracketToken = sourceCode.getFirstToken(arrayExpression);
	/*
	```
	Promise.race([promise,])
	//                   ^ penultimateToken
	//                    ^ closingBracketToken
	```
	*/
	const [
		penultimateToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);

	yield fixer.remove(openingBracketToken);
	yield fixer.remove(closingBracketToken);

	if (isCommaToken(penultimateToken)) {
		yield fixer.remove(penultimateToken);
	}
};

const hasCommentsInside = (sourceCode, node) => sourceCode.getCommentsInside(node).length > 0;

const isSingleIdentifierArrayPattern = node =>
	node.type === 'ArrayPattern'
	&& !node.typeAnnotation
	&& node.elements.length === 1
	&& node.elements[0]?.type === 'Identifier';

const getPromiseAllDestructuringPattern = awaitExpression => {
	const {parent} = awaitExpression;

	if (
		parent.type === 'VariableDeclarator'
		&& parent.init === awaitExpression
		&& isSingleIdentifierArrayPattern(parent.id)
	) {
		return parent.id;
	}

	if (
		parent.type === 'AssignmentExpression'
		&& parent.right === awaitExpression
		&& isSingleIdentifierArrayPattern(parent.left)
		&& isExpressionStatement(parent.parent)
	) {
		return parent.left;
	}
};

const isZeroIndexAccess = node =>
	node.type === 'MemberExpression'
	&& node.computed
	&& isLiteral(node.property, 0);

const isSafeReplacementPosition = node =>
	(
		node.parent.type === 'VariableDeclarator'
		&& node.parent.init === node
	)
	|| (
		node.parent.type === 'AssignmentExpression'
		&& node.parent.right === node
	);

const fixPromiseAllFirstElement = (callExpression, context) => {
	const {sourceCode} = context;

	if (hasCommentsInside(sourceCode, callExpression)) {
		return;
	}

	const awaitExpression = callExpression.parent;

	if (
		awaitExpression.type !== 'AwaitExpression'
		|| awaitExpression.argument !== callExpression
	) {
		return;
	}

	const arrayPattern = getPromiseAllDestructuringPattern(awaitExpression);

	if (arrayPattern) {
		if (hasCommentsInside(sourceCode, arrayPattern)) {
			return;
		}

		return function * (fixer) {
			yield fixer.replaceText(arrayPattern, sourceCode.getText(arrayPattern.elements[0]));
			yield fixer.replaceText(callExpression, getAwaitedPromiseText(callExpression, context));
		};
	}

	const memberExpression = awaitExpression.parent;

	if (
		isZeroIndexAccess(memberExpression)
		&& memberExpression.object === awaitExpression
		&& isSafeReplacementPosition(memberExpression)
		&& !hasCommentsInside(sourceCode, memberExpression)
	) {
		return fixer => fixer.replaceText(memberExpression, `await ${getAwaitedPromiseText(callExpression, context)}`);
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isPromiseMethodCallWithSingleElementArray(callExpression)) {
			return;
		}

		const methodName = callExpression.callee.property.name;

		const problem = {
			node: callExpression.arguments[0],
			messageId: MESSAGE_ID_ERROR,
			data: {
				method: methodName,
			},
		};

		const {sourceCode} = context;

		if (
			callExpression.parent.type === 'AwaitExpression'
			&& callExpression.parent.argument === callExpression
			&& (
				methodName !== 'all'
				|| isExpressionStatement(callExpression.parent.parent)
			)
		) {
			problem.fix = unwrapAwaitedCallExpression(callExpression, context);
			return problem;
		}

		if (methodName === 'all') {
			problem.fix = fixPromiseAllFirstElement(callExpression, context);
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION_UNWRAP,
				fix: unwrapNonAwaitedCallExpression(callExpression, context),
			},
			{
				messageId: MESSAGE_ID_SUGGESTION_SWITCH_TO_PROMISE_RESOLVE,
				fix: switchToPromiseResolve(callExpression, sourceCode),
			},
		];

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow passing single-element arrays to `Promise` methods.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
