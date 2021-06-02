'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {isNodeMatchesNameOrPath} = require('./utils/is-node-matches');
const {
	objectPrototypeMethodSelector,
	methodCallSelector,
	callExpressionSelector
} = require('./selectors');

const MESSAGE_ID = 'prefer-object-has-own';
const messages = {
	[MESSAGE_ID]: 'Use `Object.hasOwn(…)` instead of `{{description}}`.'
};

const objectPrototypeHasOwnProperty = [
	methodCallSelector({name: 'call', length: 2}),
	' > ',
	objectPrototypeMethodSelector({
		path: 'object',
		name: 'hasOwnProperty'
	}),
	'.callee'
].join('');

const lodashHasFunctions = [
	'_.has',
	'lodash.has',
	'underscore.has'
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0]
	};
	const functions = [...configFunctions, ...lodashHasFunctions];

	return {
		[objectPrototypeHasOwnProperty](node) {
			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {description: 'Object.prototype.hasOwnProperty.call(…)'},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, 'Object.hasOwn')
			});
		},
		[callExpressionSelector({length: 2})]({callee: node}) {
			const matchedFunction = functions.find(nameOrPath => isNodeMatchesNameOrPath(node, nameOrPath));
			if (!matchedFunction) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {description: `${matchedFunction.trim()}.call(…)`},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, 'Object.hasOwn')
			});
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			functions: {
				type: 'array',
				uniqueItems: true
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Object.hasOwn(…)` over `Object.prototype.hasOwnProperty.call(…)`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
