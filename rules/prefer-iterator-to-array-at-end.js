import {
	getCallExpressionArgumentsText,
	getCallExpressionTokens,
	getParenthesizedText,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-iterator-to-array-at-end';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-to-array-at-end/suggestion';

const autofixableMethods = new Set([
	'filter',
	'map',
]);

const methods = [
	...autofixableMethods,
	'flatMap',
];

const messages = {
	[MESSAGE_ID]: 'Move `.toArray()` after `.{{method}}(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Move `.toArray()` after `.{{method}}(…)`.',
};

const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});

const hasArrayParameter = node => (
	node.type === 'ArrowFunctionExpression'
	|| node.type === 'FunctionExpression'
) && (
	node.params.length > 2
	|| node.params.some(parameter => parameter.type === 'RestElement')
);

const getReplacementText = (toArrayCall, methodCall, context) => {
	const iteratorText = getParenthesizedText(toArrayCall.callee.object, context);
	const method = methodCall.callee.property.name;
	const argumentsText = getCallExpressionArgumentsText(context, methodCall);

	return `${iteratorText}.${method}(${argumentsText}).toArray()`;
};

const getFix = (toArrayCall, methodCall, context) => {
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(toArrayCall).length > 0) {
		return;
	}

	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(methodCall, context);
	const [, argumentsStart] = sourceCode.getRange(openingParenthesisToken);
	const [argumentsEnd] = sourceCode.getRange(closingParenthesisToken);

	if (sourceCode.getCommentsInside(methodCall).some(comment => {
		const [start, end] = sourceCode.getRange(comment);

		return start < argumentsStart || end > argumentsEnd;
	})) {
		return;
	}

	return fixer => fixer.replaceText(methodCall, getReplacementText(toArrayCall, methodCall, context));
};

const isAutofixable = (method, callback) => autofixableMethods.has(method) && callback.type === 'ArrowFunctionExpression';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods,
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isToArrayCall(node.callee.object)
			|| hasArrayParameter(node.arguments[0])
		) {
			return;
		}

		const method = node.callee.property.name;
		const toArrayCall = node.callee.object;
		const problem = {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID,
			data: {method},
		};
		const fix = getFix(toArrayCall, node, context);

		if (!isAutofixable(method, node.arguments[0])) {
			if (!fix) {
				return problem;
			}

			return {
				...problem,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {method},
						fix,
					},
				],
			};
		}

		if (!fix) {
			return problem;
		}

		return {
			...problem,
			fix,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving `.toArray()` to the end of iterator helper chains.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
