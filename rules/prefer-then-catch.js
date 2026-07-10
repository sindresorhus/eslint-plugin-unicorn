import {isCommentToken, isCommaToken} from '@eslint-community/eslint-utils';
import {isMethodCall, isUndefined} from './ast/index.js';
import {getArgumentRemovalRange, removeArgument} from './fix/index.js';
import {
	getParentheses,
	getParenthesizedText,
	isPromiseType,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-then-catch';
const SUGGESTION_ID = 'prefer-then-catch/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `.then(…).catch(…)` over passing a rejection handler to `.then()`.',
	[SUGGESTION_ID]: 'Move the rejection handler to `.catch()`.',
};

const isNullish = node =>
	(node.type === 'Literal' && node.value === null)
	|| (node.type === 'UnaryExpression' && node.operator === 'void')
	|| isUndefined(node);

function canThenResultCatch(callExpression, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return true;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const receiverType = checker.getNonNullableType(parserServices.getTypeAtLocation(callExpression.callee.object));
		const promiseReceiver = isPromiseType(receiverType, checker);
		if (promiseReceiver !== true) {
			return promiseReceiver !== false;
		}

		const resultType = checker.getNonNullableType(parserServices.getTypeAtLocation(callExpression));
		const catchMethod = checker.getPropertyOfType(resultType, 'catch');
		return Boolean(catchMethod && checker.getTypeOfSymbolAtLocation(catchMethod, callExpression).getCallSignatures().length > 0);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this rule best-effort.
		return true;
	}
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

function getSuggestion(callExpression, rejectionHandler, context) {
	const removalRange = getArgumentRemovalRange(rejectionHandler, context);
	if (
		wouldRemoveComments(context, removalRange, [rejectionHandler])
		|| hasTrailingArgumentComment(rejectionHandler, context)
	) {
		return;
	}

	const rejectionHandlerText = getParenthesizedText(rejectionHandler, context);
	return {
		messageId: SUGGESTION_ID,
		* fix(fixer) {
			yield removeArgument(fixer, rejectionHandler, context);
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
			isNullish(fulfillmentHandler)
			|| isNullish(rejectionHandler)
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
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
