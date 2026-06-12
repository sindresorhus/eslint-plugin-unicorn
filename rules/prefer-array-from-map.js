import {isCommaToken} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedRange,
	isParenthesized,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-array-from-map/error';
const MESSAGE_ID_SUGGESTION = 'prefer-array-from-map/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Pass the mapping function to `Array.from()` directly.',
	[MESSAGE_ID_SUGGESTION]: 'Use the `Array.from()` mapping function argument.',
};

const isArrowFunctionWithSupportedParameters = node => (
	node.type === 'ArrowFunctionExpression'
	&& node.params.length <= 2
	&& node.params.every(parameter => parameter.type !== 'RestElement')
);

const isFlatCallWithDefaultDepth = node => (
	isMethodCall(node, {
		method: 'flat',
		optionalCall: false,
		optionalMember: false,
	})
	&& (
		node.arguments.length === 0
		|| (
			node.arguments.length === 1
			&& node.arguments[0].type === 'Literal'
			&& node.arguments[0].raw === '1'
		)
	)
);

const isFollowedByDefaultFlatCall = node => (
	node.parent?.type === 'MemberExpression'
	&& node.parent.object === node
	&& node.parent.parent?.type === 'CallExpression'
	&& node.parent.parent.callee === node.parent
	&& isFlatCallWithDefaultDepth(node.parent.parent)
);

const getMapArgumentsFix = (arrayFromCall, mapCall, context) => {
	if (isParenthesized(arrayFromCall, context)) {
		return;
	}

	const {sourceCode} = context;
	const arrayFromClosingParenthesis = sourceCode.getLastToken(arrayFromCall);
	const tokenBeforeArrayFromClosingParenthesis = sourceCode.getTokenBefore(arrayFromClosingParenthesis);
	const mapClosingParenthesis = sourceCode.getLastToken(mapCall);
	const tokenBeforeMapClosingParenthesis = sourceCode.getTokenBefore(mapClosingParenthesis);
	const [mapArgumentsStart] = getParenthesizedRange(mapCall.arguments[0], context);
	const insertStart = isCommaToken(tokenBeforeArrayFromClosingParenthesis)
		? sourceCode.getRange(tokenBeforeArrayFromClosingParenthesis)[0]
		: sourceCode.getRange(arrayFromClosingParenthesis)[0];
	const insertRange = [insertStart, mapArgumentsStart];

	if (wouldRemoveComments(context, insertRange)) {
		return;
	}

	return function * (fixer) {
		yield fixer.replaceTextRange(insertRange, ', ');

		if (isCommaToken(tokenBeforeMapClosingParenthesis)) {
			yield fixer.removeRange(sourceCode.getRange(tokenBeforeMapClosingParenthesis));
		}
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', mapCall => {
		if (!(
			isMethodCall(mapCall, {
				method: 'map',
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& isMethodCall(mapCall.callee.object, {
				object: 'Array',
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& context.sourceCode.isGlobalReference(mapCall.callee.object.callee.object)
			&& !isFollowedByDefaultFlatCall(mapCall)
			&& isArrowFunctionWithSupportedParameters(mapCall.arguments[0])
		)) {
			return;
		}

		const arrayFromCall = mapCall.callee.object;
		const fix = getMapArgumentsFix(arrayFromCall, mapCall, context);

		const problem = {
			node: mapCall.callee.property,
			messageId: MESSAGE_ID_ERROR,
		};

		if (fix) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `Array.from()` mapping function argument.',
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
