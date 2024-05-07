'use strict';
const {
	isCommaToken,
	isOpeningParenToken,
} = require('@eslint-community/eslint-utils');
const {isCallExpression, isMethodCall} = require('./ast/index.js');
const {removeParentheses} = require('./fix/index.js');
const {isNodeMatchesNameOrPath} = require('./utils/index.js');

const MESSAGE_ID_ERROR = 'prefer-structured-clone/error';
const MESSAGE_ID_SUGGESTION = 'prefer-structured-clone/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `structuredClone(…)` over `{{description}}` to create a deep clone.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `structuredClone(…)`.',
};

const lodashCloneDeepFunctions = [
	'_.cloneDeep',
	'lodash.cloneDeep',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0],
	};
	const functions = [...configFunctions, ...lodashCloneDeepFunctions];

	// `JSON.parse(JSON.stringify(…))`
	context.on('CallExpression', callExpression => {
		if (!(
			// `JSON.stringify()`
			isMethodCall(callExpression, {
				object: 'JSON',
				method: 'parse',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			// `JSON.parse()`
			&& isMethodCall(callExpression.arguments[0], {
				object: 'JSON',
				method: 'stringify',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
		)) {
			return;
		}

		const jsonParse = callExpression;
		const jsonStringify = callExpression.arguments[0];

		return {
			node: jsonParse,
			loc: {
				start: jsonParse.loc.start,
				end: jsonStringify.callee.loc.end,
			},
			messageId: MESSAGE_ID_ERROR,
			data: {
				description: 'JSON.parse(JSON.stringify(…))',
				recommended: true,
			},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					* fix(fixer) {
						yield fixer.replaceText(jsonParse.callee, 'structuredClone');

						const {sourceCode} = context;

						yield fixer.remove(jsonStringify.callee);
						yield * removeParentheses(jsonStringify.callee, fixer, sourceCode);

						const openingParenthesisToken = sourceCode.getTokenAfter(jsonStringify.callee, isOpeningParenToken);
						yield fixer.remove(openingParenthesisToken);

						const [
							penultimateToken,
							closingParenthesisToken,
						] = sourceCode.getLastTokens(jsonStringify, 2);

						if (isCommaToken(penultimateToken)) {
							yield fixer.remove(penultimateToken);
						}

						yield fixer.remove(closingParenthesisToken);
					},
				},
			],
		};
	});

	// `_.cloneDeep(foo)`
	context.on('CallExpression', callExpression => {
		if (!isCallExpression(callExpression, {
			argumentsLength: 1,
			optional: false,
		})) {
			return;
		}

		const {callee} = callExpression;
		const matchedFunction = functions.find(nameOrPath => isNodeMatchesNameOrPath(callee, nameOrPath));

		if (!matchedFunction) {
			return;
		}

		return {
			node: callee,
			messageId: MESSAGE_ID_ERROR,
			data: {
				description: `${matchedFunction.trim()}(…)`,
			},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(callee, 'structuredClone'),
				},
			],
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			functions: {
				type: 'array',
				uniqueItems: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `structuredClone` to create a deep clone.',
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		messages,
	},
};
