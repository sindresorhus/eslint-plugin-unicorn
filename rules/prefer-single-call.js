import {getStaticValue, hasSideEffect, isSemicolonToken} from '@eslint-community/eslint-utils';
import {
	getCallExpressionTokens,
	getCallExpressionArgumentsText,
	isSameReference,
	isNodeMatches,
	getPreviousNode,
	hasOptionalChainElement,
	needsSemicolon,
} from './utils/index.js';
import {isMethodCall, isMemberExpression, isCallExpression} from './ast/index.js';

const ERROR = 'error/array-push';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Do not call `{{description}}` multiple times.',
	[SUGGESTION]: 'Merge with previous one.',
};

const isClassList = node => isMemberExpression(node, {
	property: 'classList',
	computed: false,
});

const hasSpreadElement = callExpression => callExpression.arguments.some(node => node.type === 'SpreadElement');

const hasStaticValue = (node, sourceCode) => getStaticValue(node, sourceCode.getScope(node)) !== null;

function getExpressionStatement(callExpression) {
	let expressionStatement = callExpression.parent;
	if (expressionStatement.type === 'ChainExpression' && callExpression === expressionStatement.expression) {
		expressionStatement = expressionStatement.parent;
	}

	return expressionStatement.type === 'ExpressionStatement' ? expressionStatement : undefined;
}

function getCallExpressionFromExpressionStatement(expressionStatement) {
	const {expression} = expressionStatement;

	return expression.type === 'ChainExpression' ? expression.expression : expression;
}

function getMergePlan(firstCall, secondCall, keepSecondCall) {
	const shouldKeepSecondCall = keepSecondCall
		&& (
			!hasOptionalChainElement(secondCall.callee)
			|| hasOptionalChainElement(firstCall.callee)
		);

	return {
		shouldKeepSecondCall,
		shouldPrependSourceArguments: keepSecondCall && !shouldKeepSecondCall,
		targetCall: shouldKeepSecondCall ? secondCall : firstCall,
		sourceCall: shouldKeepSecondCall ? firstCall : secondCall,
	};
}

function shouldUseSuggestionForMerge(firstCall, secondCall, keepSecondCall, sourceCode) {
	const argumentsToCheckForSideEffects = keepSecondCall
		? [...firstCall.arguments, ...secondCall.arguments]
		: secondCall.arguments;

	return (keepSecondCall && (hasSpreadElement(firstCall) || hasSpreadElement(secondCall)))
		|| (keepSecondCall && argumentsToCheckForSideEffects.some(element => !hasStaticValue(element, sourceCode)))
		|| argumentsToCheckForSideEffects.some(element => hasSideEffect(element, sourceCode));
}

function hasCommentsInRange(sourceCode, range) {
	return sourceCode.getAllComments().some(comment => {
		const [start, end] = sourceCode.getRange(comment);

		return start >= range[0] && end <= range[1];
	});
}

const cases = [
	{
		description: 'Array#push()',
		test: callExpression => isMethodCall(callExpression, {
			method: 'push',
			optionalCall: false,
		}),
		ignore: [
			'stream.push',
			'this.push',
			'this.stream.push',
			'process.stdin.push',
			'process.stdout.push',
			'process.stderr.push',
		],
	},
	{
		description: 'Array#unshift()',
		test: callExpression => isMethodCall(callExpression, {
			method: 'unshift',
			optionalCall: false,
		}),
		keepSecondCall: true,
		ignore: [
			'stream.unshift',
			'this.unshift',
			'this.stream.unshift',
			'process.stdin.unshift',
			'process.stdout.unshift',
			'process.stderr.unshift',
		],
	},
	{
		description: 'Element#classList.add()',
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'add',
				optionalCall: false,
				optionalMember: false,
			})
			&& isClassList(callExpression.callee.object),
	},
	{
		description: 'Element#classList.remove()',
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'remove',
				optionalCall: false,
				optionalMember: false,
			})
			&& isClassList(callExpression.callee.object),
	},
	{
		description: 'importScripts()',
		test: callExpression => isCallExpression(callExpression, {name: 'importScripts'}),
	},
];

function create(context) {
	const {ignore: ignoredCalleeInOptions} = context.options[0];
	const {sourceCode} = context;

	context.on('CallExpression', function * (secondCall) {
		for (const {description, test, ignore = [], keepSecondCall = false} of cases) {
			if (!test(secondCall)) {
				continue;
			}

			const ignoredCallee = [...ignore, ...ignoredCalleeInOptions];
			if (isNodeMatches(secondCall.callee, ignoredCallee)) {
				continue;
			}

			const secondExpressionStatement = getExpressionStatement(secondCall);
			if (!secondExpressionStatement) {
				continue;
			}

			const firstExpressionStatement = getPreviousNode(secondExpressionStatement, context);
			if (firstExpressionStatement?.type !== 'ExpressionStatement') {
				continue;
			}

			const firstCall = getCallExpressionFromExpressionStatement(firstExpressionStatement);

			if (!test(firstCall) || !isSameReference(firstCall.callee, secondCall.callee)) {
				continue;
			}

			const {
				shouldKeepSecondCall,
				shouldPrependSourceArguments,
				targetCall,
				sourceCall,
			} = getMergePlan(firstCall, secondCall, keepSecondCall);
			const sourceCallArguments = sourceCall.arguments;
			const firstExpressionStatementRange = sourceCode.getRange(firstExpressionStatement);
			const secondExpressionStatementRange = sourceCode.getRange(secondExpressionStatement);
			const removalRange = shouldKeepSecondCall
				? [
					firstExpressionStatementRange[0],
					secondExpressionStatementRange[0],
				]
				: [
					firstExpressionStatementRange[1],
					secondExpressionStatementRange[1],
				];
			const shouldKeepSemicolon = !shouldKeepSecondCall
				&& !isSemicolonToken(sourceCode.getLastToken(firstExpressionStatement))
				&& isSemicolonToken(sourceCode.getLastToken(secondExpressionStatement));
			const shouldAddSemicolon = shouldKeepSecondCall
				&& needsSemicolon(
					sourceCode.getTokenBefore(firstExpressionStatement),
					context,
					sourceCode.text.slice(secondExpressionStatementRange[0], secondExpressionStatementRange[0] + 1),
				);
			const problem = {
				node: secondCall.callee.type === 'Identifier' ? secondCall.callee : secondCall.callee.property,
				messageId: ERROR,
				data: {description},
			};

			const fix = function * (fixer) {
				if (sourceCallArguments.length > 0) {
					const text = getCallExpressionArgumentsText(context, sourceCall, !shouldPrependSourceArguments);

					const {
						openingParenthesisToken,
						trailingCommaToken,
						closingParenthesisToken,
					} = getCallExpressionTokens(targetCall, context);

					if (shouldPrependSourceArguments) {
						yield fixer.insertTextAfter(openingParenthesisToken, targetCall.arguments.length > 0 ? `${text}, ` : text);
					} else {
						yield (
							trailingCommaToken
								? fixer.insertTextAfter(trailingCommaToken, ` ${text}`)
								: fixer.insertTextBefore(closingParenthesisToken, targetCall.arguments.length > 0 ? `, ${text}` : text)
						);
					}
				}

				yield fixer.replaceTextRange(removalRange, shouldKeepSemicolon || shouldAddSemicolon ? ';' : '');
			};

			if (!hasCommentsInRange(sourceCode, removalRange)) {
				if (shouldUseSuggestionForMerge(firstCall, secondCall, keepSecondCall, sourceCode)) {
					problem.suggest = [
						{
							messageId: SUGGESTION,
							fix,
						},
					];
				} else {
					problem.fix = fix;
				}
			}

			yield problem;
		}
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true,
				description: 'Methods to ignore.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce combining multiple `Array#{push,unshift}()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{ignore: []}],
		messages,
	},
};

export default config;
