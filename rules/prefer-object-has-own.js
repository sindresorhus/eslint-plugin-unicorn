'use strict';
const {isNodeMatches, isNodeMatchesNameOrPath} = require('./utils/is-node-matches.js');
const {
	objectPrototypeMethodSelector,
	methodCallSelector,
	callExpressionSelector,
} = require('./selectors/index.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const MESSAGE_ID = 'prefer-object-has-own';
const messages = {
	[MESSAGE_ID]: 'Use `Object.hasOwn(…)` instead of `{{description}}(…)`.',
};

const objectPrototypeHasOwnProperty = [
	methodCallSelector({method: 'call', argumentsLength: 2}),
	' > ',
	objectPrototypeMethodSelector({
		path: 'object',
		method: 'hasOwnProperty',
	}),
	'.callee',
].join('');

const lodashHasFunctions = [
	'_.has',
	'lodash.has',
	'underscore.has',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0],
	};
	const functions = [...configFunctions, ...lodashHasFunctions];

	return Object.fromEntries(
		[
			{
				selector: objectPrototypeHasOwnProperty,
				description: 'Object.prototype.hasOwnProperty.call',
			},
			{
				selector: `${callExpressionSelector({argumentsLength: 2})} > .callee`,
				test: node => isNodeMatches(node, functions),
				description: node => functions.find(nameOrPath => isNodeMatchesNameOrPath(node, nameOrPath)).trim(),
			},
		].map(({selector, test, description}) => [
			selector,
			node => {
				if (test && !test(node)) {
					return;
				}

				return {
					node,
					messageId: MESSAGE_ID,
					data: {
						description: typeof description === 'string' ? description : description(node),
					},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					* fix(fixer) {
						yield fixer.replaceText(node, 'Object.hasOwn');

						if (
							node.object
							&& node.object.object
							&& node.object.object.type === 'ObjectExpression'
						) {
							yield * fixSpaceAroundKeyword(fixer, node.parent, context.getSourceCode());
						}
					},
				};
			},
		]),
	);
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
			description: 'Prefer `Object.hasOwn(…)` over `Object.prototype.hasOwnProperty.call(…)`.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
