'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';
const messages = {
	[ERROR_MESSAGE_ID]: 'Use `undefined` instead of `null`.',
	[SUGGESTION_REPLACE_MESSAGE_ID]: 'Replace `null` with `undefined`.',
	[SUGGESTION_REMOVE_MESSAGE_ID]: 'Remove `null`.'
};

const objectCreateSelector = methodSelector({
	object: 'Object',
	name: 'create',
	length: 1
});

// `useRef(null)`
// eslint-disable-next-line unicorn/prevent-abbreviations
const useRefSelector = [
	'CallExpression',
	'[callee.type="Identifier"]',
	'[callee.name="useRef"]',
	'[arguments.length=1]',
	'[arguments.0.type!="SpreadElement"]'
].join('');

// `React.useRef(null)`
// eslint-disable-next-line unicorn/prevent-abbreviations
const reactUseRefSelector = methodSelector({
	object: 'React',
	name: 'useRef',
	length: 1
});

const selector = [
	'Literal',
	'[raw="null"]',
	`:not(:matches(${[objectCreateSelector, useRefSelector, reactUseRefSelector].join(', ')}) > .arguments)`
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
			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID
			};

			/* istanbul ignore next */
			const {parent = {}, range} = node;

			if (!checkStrictEquality && isStrictEqual(parent)) {
				return;
			}

			if (isSecondArgumentOfInsertBefore(node)) {
				return;
			}

			const fix = fixer => fixer.replaceText(node, 'undefined');
			const replaceSuggestion = {
				messageId: SUGGESTION_REPLACE_MESSAGE_ID,
				fix
			};

			if (isLooseEqual(parent)) {
				problem.fix = fix;
			} else if (parent.type === 'ReturnStatement' && parent.argument === node) {
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.remove(node)
					},
					replaceSuggestion
				];
			} else if (parent.type === 'VariableDeclarator' && parent.init === node && parent.parent.kind !== 'const') {
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.removeRange([parent.id.range[1], range[1]])
					},
					replaceSuggestion
				];
			} else {
				problem.suggest = [
					replaceSuggestion
				];
			}

			context.report(problem);
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
			description: 'Disallow the use of the `null` literal.',
			url: getDocumentationUrl(__filename)
		},
		messages,
		schema,
		fixable: 'code'
	}
};
