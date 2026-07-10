import {isCommentToken, isCommaToken} from '@eslint-community/eslint-utils';
import {isFunction, isMethodCall, isUndefined} from './ast/index.js';
import {getArgumentRemovalRange} from './fix/index.js';
import {
	getParentheses,
	getParenthesizedText,
	isGlobalIdentifier,
	isPromiseType,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-then-catch';
const SUGGESTION_ID = 'prefer-then-catch/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `.then(…).catch(…)` over passing a rejection handler to `.then()`.',
	[SUGGESTION_ID]: 'Move the rejection handler to `.catch()`.',
};

function isNullish(node, context) {
	node = unwrapTypeScriptExpression(node);
	return (node.type === 'Literal' && node.value === null)
		|| (node.type === 'UnaryExpression' && node.operator === 'void')
		|| (isUndefined(node) && isGlobalIdentifier(node, context));
}

function canThenResultCatch(callExpression, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return true;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const receiverType = checker.getNonNullableType(parserServices.getTypeAtLocation(callExpression.callee.object));
		const promiseReceiver = isPromiseType(receiverType, checker);
		if (promiseReceiver === false) {
			return false;
		}

		const resultType = checker.getNonNullableType(parserServices.getTypeAtLocation(callExpression));
		const catchMethod = checker.getPropertyOfType(resultType, 'catch');
		return Boolean(catchMethod && checker.getTypeOfSymbolAtLocation(catchMethod, callExpression).getCallSignatures().length > 0);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this rule best-effort.
		return true;
	}
}

function getRejectionHandlerRemovalRange(node, context) {
	const range = getArgumentRemovalRange(node, context);
	const lastToken = getParentheses(node, context).at(-1) ?? node;
	const trailingComma = context.sourceCode.getTokenAfter(lastToken);
	if (isCommaToken(trailingComma)) {
		range[1] = context.sourceCode.getRange(trailingComma)[1];
	}

	return range;
}

function hasTrailingArgumentComment(node, context) {
	const {sourceCode} = context;
	const lastToken = getParentheses(node, context).at(-1) ?? node;
	let tokenAfter = sourceCode.getTokenAfter(lastToken, {includeComments: true});

	if (isCommentToken(tokenAfter)) {
		return true;
	}

	if (isCommaToken(tokenAfter)) {
		tokenAfter = sourceCode.getTokenAfter(tokenAfter, {includeComments: true});
	}

	return isCommentToken(tokenAfter);
}

function isRejectionHandlerSafeToMove(node) {
	node = unwrapTypeScriptExpression(node);
	return node.type === 'Identifier'
		|| isFunction(node);
}

function getSuggestion(callExpression, rejectionHandler, context) {
	const removalRange = getRejectionHandlerRemovalRange(rejectionHandler, context);
	if (
		!isRejectionHandlerSafeToMove(rejectionHandler)
		|| wouldRemoveComments(context, removalRange, [rejectionHandler])
		|| hasTrailingArgumentComment(rejectionHandler, context)
	) {
		return;
	}

	const rejectionHandlerText = getParenthesizedText(rejectionHandler, context);
	return {
		messageId: SUGGESTION_ID,
		* fix(fixer) {
			yield fixer.removeRange(removalRange);
			yield fixer.insertTextAfter(callExpression, `.catch(${rejectionHandlerText})`);
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'then',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		const [fulfillmentHandler, rejectionHandler] = callExpression.arguments;
		if (
			isNullish(fulfillmentHandler, context)
			|| isNullish(rejectionHandler, context)
			|| !canThenResultCatch(callExpression, context)
		) {
			return;
		}

		const suggestion = getSuggestion(callExpression, rejectionHandler, context);
		return {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			...(suggestion && {suggest: [suggestion]}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prefer `.then().catch()` over `.then(…, …)` for error handling.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
