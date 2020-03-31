'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';

const objectCreateSelector = methodSelector({
	object: 'Object',
	name: 'create',
	length: 1
});

const selector = [
	`:not(${objectCreateSelector})`,
	'>',
	'Literal',
	'[raw="null"]'
].join('');

const isLooseEqual = node => node.type === 'BinaryExpression' && ['==', '!='].includes(node.operator);

const create = context => ({
	[selector]: node => {
		const problem = {
			node,
			messageId: ERROR_MESSAGE_ID
		};

		const fix = fixer => fixer.replaceText(node, 'undefined');

		/* istanbul ignore next */
		const {parent = {}} = node;
		if (isLooseEqual(parent)) {
			problem.fix = fix;
		} else if (parent.type === 'ReturnStatement' && parent.argument === node) {
			problem.suggest = [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, '')
				}
			];
		} else if (parent.type === 'VariableDeclarator' && parent.init === node && parent.parent.kind !== 'const') {
			problem.suggest = [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					fix: fixer => fixer.replaceTextRange([parent.id.range[1], node.range[1]], '')
				}
			];
		} else {
			problem.suggest = [
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					fix
				}
			];
		}

		context.report(problem);
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[ERROR_MESSAGE_ID]: 'Use `undefined` instead of `null`.',
			[SUGGESTION_REPLACE_MESSAGE_ID]: 'Replace `null` with `undefined`.',
			[SUGGESTION_REMOVE_MESSAGE_ID]: 'Remove `null`.'
		},
		fixable: true
	}
};
