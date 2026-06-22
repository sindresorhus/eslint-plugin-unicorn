import {
	isEmptyStringLiteral,
	isExpressionStatement,
	isMethodCall,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getParenthesizedText,
	isKnownNonDomNode,
	isNodeValueNotDomNode,
	isParenthesized,
	isSameReference,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	shouldAddParenthesesToUnaryExpressionArgument,
	wouldRemoveComments,
	hasOptionalChainElement,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-toggle-attribute/error';
const MESSAGE_ID_SUGGESTION = 'prefer-toggle-attribute/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using `Element#toggleAttribute()` to toggle attributes.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `Element#toggleAttribute()`.',
};

function getReceiverText(node, context) {
	const text = getParenthesizedText(node, context);
	if (
		!isParenthesized(node, context.sourceCode)
		&& shouldAddParenthesesToMemberExpressionObject(node, context)
	) {
		return `(${text})`;
	}

	return text;
}

const getConditionText = (node, context, isNegative) => {
	let text = getParenthesizedText(node, context);

	if (isNegative) {
		if (
			!isParenthesized(node, context.sourceCode)
			&& shouldAddParenthesesToUnaryExpressionArgument(node, '!')
		) {
			text = `(${text})`;
		}

		return `!${text}`;
	}

	if (
		!isParenthesized(node, context.sourceCode)
		&& node.type === 'SequenceExpression'
	) {
		return `(${text})`;
	}

	return text;
};

const isAttributeMethodCall = (node, methods, argumentsLength) =>
	isMethodCall(node, {
		methods,
		argumentsLength,
		optionalCall: false,
		computed: false,
	});

const isDataAttributeName = node =>
	node.type === 'Literal'
	&& typeof node.value === 'string'
	&& node.value.toLowerCase().startsWith('data-');

function getAttributeCall(node) {
	if (node?.type === 'ChainExpression') {
		node = node.expression;
	}

	if (
		isAttributeMethodCall(node, ['removeAttribute', 'hasAttribute'], 1)
		|| isAttributeMethodCall(node, ['setAttribute'], 2)
	) {
		const {callee} = node;
		const [attributeName, attributeValue] = node.arguments;

		if (
			isDataAttributeName(attributeName)
			|| (callee.property.name === 'setAttribute' && !isEmptyStringLiteral(attributeValue))
		) {
			return;
		}

		return {
			node,
			method: callee.property.name,
			receiver: callee.object,
			attributeName,
			isOptional: Boolean(callee.optional),
		};
	}
}

function getClauseCall(node) {
	if (!node) {
		return;
	}

	if (node.type === 'BlockStatement') {
		if (node.body.length !== 1) {
			return;
		}

		node = node.body[0];
	}

	if (node.type === 'ExpressionStatement') {
		node = node.expression;
	}

	return getAttributeCall(node);
}

const isSameReceiverAndAttribute = (callA, callB) =>
	callA.isOptional === callB.isOptional
	&& isSameReference(callA.receiver, callB.receiver)
	&& isSameReference(callA.attributeName, callB.attributeName);

const hasSupportedReceiver = call => !hasOptionalChainElement(call.receiver);

const isKnownNonDomReceiver = (call, context) =>
	isNodeValueNotDomNode(call.receiver)
	|| isKnownNonDomNode(call.receiver, context);

function getHasAttributeCondition(node, expectedCall, isNegative = false) {
	if (node.type === 'ChainExpression') {
		return getHasAttributeCondition(node.expression, expectedCall, isNegative);
	}

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
		&& node.prefix
	) {
		return getHasAttributeCondition(node.argument, expectedCall, !isNegative);
	}

	const call = getAttributeCall(node);
	if (
		call?.method === 'hasAttribute'
		&& isSameReceiverAndAttribute(call, expectedCall)
		&& hasSupportedReceiver(call)
	) {
		return {
			isNegative,
		};
	}
}

const getProblem = (node, fix, {forceSuggestion = false} = {}) => {
	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR,
	};

	if (!fix) {
		return problem;
	}

	const shouldUseSuggestion = node.type !== 'IfStatement'
		&& !(isExpressionStatement(node) || isExpressionStatement(node.parent));

	if (forceSuggestion || shouldUseSuggestion) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix,
			},
		];
	} else {
		problem.fix = fix;
	}

	return problem;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on(['IfStatement', 'ConditionalExpression'], node => {
		const consequentCall = getClauseCall(node.consequent);
		const alternateCall = getClauseCall(node.alternate);

		if (!(
			consequentCall
			&& alternateCall
			&& consequentCall.method !== alternateCall.method
			&& [consequentCall.method, alternateCall.method].every(method => method === 'setAttribute' || method === 'removeAttribute')
			&& isSameReceiverAndAttribute(consequentCall, alternateCall)
			&& hasSupportedReceiver(consequentCall)
			&& hasSupportedReceiver(alternateCall)
			&& !isKnownNonDomReceiver(consequentCall, context)
			&& !isKnownNonDomReceiver(alternateCall, context)
		)) {
			return;
		}

		const setCall = consequentCall.method === 'setAttribute' ? consequentCall : alternateCall;
		const setWhenTrue = consequentCall === setCall;
		const hasAttributeCondition = getHasAttributeCondition(node.test, setCall);
		const shouldToggleWithoutForce = hasAttributeCondition && setWhenTrue === hasAttributeCondition.isNegative;
		const conditionText = shouldToggleWithoutForce ? '' : getConditionText(node.test, context, !setWhenTrue);

		if (conditionText && setCall.isOptional) {
			return;
		}

		const preservedNodes = [
			setCall.receiver,
			setCall.attributeName,
		];
		if (conditionText) {
			preservedNodes.push(node.test);
		}

		const fix = wouldRemoveComments(context, node, preservedNodes)
			? undefined
			: function * (fixer) {
				const receiverText = getReceiverText(setCall.receiver, context);
				const attributeNameText = getParenthesizedText(setCall.attributeName, context);
				const optional = setCall.isOptional ? '?' : '';
				const isExpression = node.type === 'ConditionalExpression';
				let text = `${receiverText}${optional}.toggleAttribute(${attributeNameText}${conditionText ? `, ${conditionText}` : ''})`;

				if (!isExpression) {
					text += ';';
				}

				if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
					text = `;${text}`;
				}

				yield fixer.replaceText(node, text);

				if (isExpression) {
					yield fixSpaceAroundKeyword(fixer, node, context);
				}
			};

		return getProblem(node, fix, {forceSuggestion: Boolean(conditionText)});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `Element#toggleAttribute()` to toggle attributes.',
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
