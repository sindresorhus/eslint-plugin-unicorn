import {
	getCallExpressionArgumentsText,
	getCallExpressionTokens,
	getParenthesizedText,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-iterator-to-array-at-end';

const methods = [
	'filter',
	'flatMap',
	'map',
];

const messages = {
	[MESSAGE_ID]: 'Move `.toArray()` after `.{{method}}(…)`.',
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

const getReplacementText = (toArrayCall, methodCall, context, openingParenthesisToken) => {
	const {sourceCode} = context;
	const iteratorText = getParenthesizedText(toArrayCall.callee.object, context);
	const method = methodCall.callee.property.name;
	const argumentsText = getCallExpressionArgumentsText(context, methodCall);
	const [, methodNameEnd] = sourceCode.getRange(methodCall.callee.property);
	const [openingParenthesisStart] = sourceCode.getRange(openingParenthesisToken);
	const textBetweenMethodAndArguments = sourceCode.text.slice(methodNameEnd, openingParenthesisStart);

	return `${iteratorText}.${method}${textBetweenMethodAndArguments}(${argumentsText}).toArray()`;
};

const getFix = (toArrayCall, methodCall, context) => {
	const {sourceCode} = context;
	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(methodCall, context);
	const [, methodNameEnd] = sourceCode.getRange(methodCall.callee.property);
	const [argumentsEnd] = sourceCode.getRange(closingParenthesisToken);

	if (sourceCode.getCommentsInside(methodCall).some(comment => {
		const [start, end] = sourceCode.getRange(comment);

		return start < methodNameEnd || end > argumentsEnd;
	})) {
		return;
	}

	return fixer => fixer.replaceText(methodCall, getReplacementText(toArrayCall, methodCall, context, openingParenthesisToken));
};

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
		const fix = getFix(toArrayCall, node, context);
		const problem = {
			node: toArrayCall.callee.property,
			messageId: MESSAGE_ID,
			data: {method},
		};

		if (!fix) {
			return problem;
		}

		return {
			...problem,
			suggest: [
				{
					messageId: MESSAGE_ID,
					data: {method},
					fix,
				},
			],
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
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
