'use strict';
const {isCallExpression} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {isNodeMatchesNameOrPath} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'prefer-structured-clone/error';
const MESSAGE_ID_SUGGESTION = 'prefer-structured-clone/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `structuredClone(…)` over `{{description}}(…)` to create a deep clone.',
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

	context.on('CallExpression', callExpression => {


	});

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
				description: matchedFunction.trim(),
			},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(callee, 'structuredClone'),
				}
			],
		}
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
		},
		hasSuggestions: true,
		schema,
		messages,
	},
};
