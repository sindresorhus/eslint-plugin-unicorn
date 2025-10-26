import {hasSideEffect, isSemicolonToken} from '@eslint-community/eslint-utils';
import {
	getCallExpressionTokens,
	getCallExpressionArgumentsText,
	isSameReference,
	isNodeMatches,
	getPreviousNode,
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
	const {
		ignore: ignoredCalleeInOptions,
	} = {
		ignore: [],
		...context.options[0],
	};
	const {sourceCode} = context;

	return {
		* CallExpression(secondCall) {
			for (const {description, test, ignore = []} of cases) {
				if (!test(secondCall)) {
					continue;
				}

				const ignoredCallee = [...ignore, ...ignoredCalleeInOptions];
				if (isNodeMatches(secondCall.callee, ignoredCallee)) {
					continue;
				}

				let secondExpressionStatement = secondCall.parent;
				if (secondExpressionStatement.type === 'ChainExpression' && secondCall === secondExpressionStatement.expression) {
					secondExpressionStatement = secondExpressionStatement.parent;
				}

				if (secondExpressionStatement.type !== 'ExpressionStatement') {
					continue;
				}

				const firstExpressionStatement = getPreviousNode(secondExpressionStatement, context);
				if (firstExpressionStatement?.type !== 'ExpressionStatement') {
					continue;
				}

				let firstCall = firstExpressionStatement.expression;

				if (firstCall.type === 'ChainExpression') {
					firstCall = firstCall.expression;
				}

				if (!test(firstCall) || !isSameReference(firstCall.callee, secondCall.callee)) {
					continue;
				}

				const secondCallArguments = secondCall.arguments;
				const problem = {
					node: secondCall.callee.type === 'Identifier' ? secondCall.callee : secondCall.callee.property,
					messageId: ERROR,
					data: {description},
				};

				const fix = function * (fixer) {
					if (secondCallArguments.length > 0) {
						const text = getCallExpressionArgumentsText(context, secondCall);

						const {
							trailingCommaToken,
							closingParenthesisToken,
						} = getCallExpressionTokens(firstCall, context);

						yield (
							trailingCommaToken
								? fixer.insertTextAfter(trailingCommaToken, ` ${text}`)
								: fixer.insertTextBefore(closingParenthesisToken, firstCall.arguments.length > 0 ? `, ${text}` : text)
						);
					}

					const shouldKeepSemicolon = !isSemicolonToken(sourceCode.getLastToken(firstExpressionStatement))
						&& isSemicolonToken(sourceCode.getLastToken(secondExpressionStatement));
					const [, start] = sourceCode.getRange(firstExpressionStatement);
					const [, end] = sourceCode.getRange(secondExpressionStatement);

					yield fixer.replaceTextRange([start, end], shouldKeepSemicolon ? ';' : '');
				};

				if (secondCallArguments.some(element => hasSideEffect(element, sourceCode))) {
					problem.suggest = [
						{
							messageId: SUGGESTION,
							fix,
						},
					];
				} else {
					problem.fix = fix;
				}

				yield problem;
			}
		},
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true,
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
			description: 'Enforce combining multiple `Array#push()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
