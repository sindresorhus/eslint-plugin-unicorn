'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {isNodeMatches, isNodeMatchesNameOrPath} = require('./utils/is-node-matches');
const {
	objectPrototypeMethodSelector,
	methodCallSelector,
	callExpressionSelector
} = require('./selectors');

const MESSAGE_ID = 'prefer-object-has-own';
const messages = {
	[MESSAGE_ID]: 'Use `Object.hasOwn(…)` instead of `{{description}}(…)`.'
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

	return Object.fromEntries(
		[
			{
				selector: objectPrototypeHasOwnProperty,
				description: 'Object.prototype.hasOwnProperty.call'
			},
			{
				selector: `${callExpressionSelector({length: 2})} > .callee`,
				test: node => isNodeMatches(node, functions),
				description: node => functions.find(nameOrPath => isNodeMatchesNameOrPath(node, nameOrPath)).trim()
			}
		].map(({selector, test, description}) => [
			selector,
			node => {
				if (test && !test(node)) {
					return;
				}

				context.report({
					node,
					messageId: MESSAGE_ID,
					data: {
						description: typeof description === 'string' ? description : description(node)
					},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node, 'Object.hasOwn')
				});
			}
		])
	);
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
