'use strict';
const {
	not,
	matches,
	methodCallSelector,
	callExpressionSelector
} = require('./selectors/index.js');

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';
const messages = {
	[ERROR_MESSAGE_ID]: 'Use `undefined` instead of `null`.',
	[SUGGESTION_REPLACE_MESSAGE_ID]: 'Replace `null` with `undefined`.',
	[SUGGESTION_REMOVE_MESSAGE_ID]: 'Remove `null`.'
};

const objectCreateSelector = methodCallSelector({
	object: 'Object',
	name: 'create',
	length: 1
});

// `useRef(null)`
// eslint-disable-next-line unicorn/prevent-abbreviations
const useRefSelector = callExpressionSelector({name: 'useRef', length: 1});

// `React.useRef(null)`
// eslint-disable-next-line unicorn/prevent-abbreviations
const reactUseRefSelector = methodCallSelector({
	object: 'React',
	name: 'useRef',
	length: 1
});

const selector = [
	'Literal',
	'[raw="null"]',
	not(`${matches([objectCreateSelector, useRefSelector, reactUseRefSelector])} > .arguments`)
].join('');

const isLooseEqual = node => node.type === 'BinaryExpression' && ['==', '!='].includes(node.operator);
const isStrictEqual = node => node.type === 'BinaryExpression' && ['===', '!=='].includes(node.operator);
const isSecondArgumentOfInsertBefore = node =>
	node.parent.type === 'CallExpression' &&
	!node.parent.optional &&
	node.parent.arguments.length === 2 &&
	node.parent.arguments[0].type !== 'SpreadElement' &&
	node.parent.arguments[1] === node &&
	node.parent.callee.type === 'MemberExpression' &&
	!node.parent.callee.computed &&
	!node.parent.callee.optional &&
	node.parent.callee.property.type === 'Identifier' &&
	node.parent.callee.property.name === 'insertBefore';

const create = context => {
	const {checkStrictEquality} = {
		checkStrictEquality: false,
		...context.options[0]
	};

	return {
		[selector]: node => {
			const {parent} = node;
			if (!checkStrictEquality && isStrictEqual(parent)) {
				return;
			}

			if (isSecondArgumentOfInsertBefore(node)) {
				return;
			}

			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID
			};

			const useUndefinedFix = fixer => fixer.replaceText(node, 'undefined');

			if (isLooseEqual(parent)) {
				problem.fix = useUndefinedFix;
				return problem;
			}

			const useUndefinedSuggestion = {
				messageId: SUGGESTION_REPLACE_MESSAGE_ID,
				fix: useUndefinedFix
			};

			if (parent.type === 'ReturnStatement' && parent.argument === node) {
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.remove(node)
					},
					useUndefinedSuggestion
				];
				return problem;
			}

			if (parent.type === 'VariableDeclarator' && parent.init === node && parent.parent.kind !== 'const') {
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.removeRange([parent.id.range[1], node.range[1]])
					},
					useUndefinedSuggestion
				];
				return problem;
			}

			problem.suggest = [useUndefinedSuggestion];
			return problem;
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			checkStrictEquality: {
				type: 'boolean',
				default: false
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
			description: 'Disallow the use of the `null` literal.'
		},
		fixable: 'code',
		schema,
		messages,
		hasSuggestions: true
	}
};
