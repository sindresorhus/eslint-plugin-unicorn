'use strict';
const {methodCallSelector, matches, memberExpressionSelector} = require('./selectors/index.js');
const {checkVueTemplate} = require('./utils/rule.js');
const {isBooleanNode} = require('./utils/boolean.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const isLiteralValue = require('./utils/is-literal-value.js');
const {removeMemberExpressionProperty} = require('./fix/index.js');

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const ERROR_ID_ARRAY_FILTER = 'filter';
const messages = {
	[ERROR_ID_ARRAY_SOME]: 'Prefer `.some(…)` over `.find(…)`.',
	[SUGGESTION_ID_ARRAY_SOME]: 'Replace `.find(…)` with `.some(…)`.',
	[ERROR_ID_ARRAY_FILTER]: 'Prefer `.some(…)` over non-zero length check from `.filter(…)`.',
};

const arrayFindCallSelector = methodCallSelector({
	method: 'find',
	minimumArguments: 1,
	maximumArguments: 2,
});

const isCheckingUndefined = node =>
	node.parent.type === 'BinaryExpression'
	// Not checking yoda expression `null != foo.find()` and `undefined !== foo.find()
	&& node.parent.left === node
	&& (
		(
			(
				node.parent.operator === '!='
				|| node.parent.operator === '=='
				|| node.parent.operator === '==='
				|| node.parent.operator === '!=='
			)
			&& node.parent.right.type === 'Identifier'
			&& node.parent.right.name === 'undefined'
		)
		|| (
			(
				node.parent.operator === '!='
				|| node.parent.operator === '=='
			)
			// eslint-disable-next-line unicorn/no-null
			&& isLiteralValue(node.parent.right, null)
		)
	);

const arrayFilterCallSelector = [
	'BinaryExpression',
	'[right.type="Literal"]',
	'[right.raw="0"]',
	// We assume the user already follows `unicorn/explicit-length-check`. These are allowed in that rule.
	matches(['[operator=">"]', '[operator="!=="]']),
	' > ',
	`${memberExpressionSelector('length')}.left`,
	' > ',
	`${methodCallSelector('filter')}.object`,
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[arrayFindCallSelector](findCall) {
		const isCompare = isCheckingUndefined(findCall);
		if (!isCompare && !isBooleanNode(findCall)) {
			return;
		}

		const findProperty = findCall.callee.property;
		return {
			node: findProperty,
			messageId: ERROR_ID_ARRAY_SOME,
			suggest: [
				{
					messageId: SUGGESTION_ID_ARRAY_SOME,
					* fix(fixer) {
						yield fixer.replaceText(findProperty, 'some');

						if (!isCompare) {
							return;
						}

						const parenthesizedRange = getParenthesizedRange(findCall, context.getSourceCode());
						yield fixer.replaceTextRange([parenthesizedRange[1], findCall.parent.range[1]], '');

						if (findCall.parent.operator === '!=' || findCall.parent.operator === '!==') {
							return;
						}

						yield fixer.insertTextBeforeRange(parenthesizedRange, '!');
					},
				},
			],
		};
	},
	[arrayFilterCallSelector](filterCall) {
		const filterProperty = filterCall.callee.property;
		return {
			node: filterProperty,
			messageId: ERROR_ID_ARRAY_FILTER,
			* fix(fixer) {
				// `.filter` to `.some`
				yield fixer.replaceText(filterProperty, 'some');

				const sourceCode = context.getSourceCode();
				const lengthNode = filterCall.parent;
				/*
					Remove `.length`
					`(( (( array.filter() )).length )) > (( 0 ))`
					------------------------^^^^^^^
				*/
				yield removeMemberExpressionProperty(fixer, lengthNode, sourceCode);

				const compareNode = lengthNode.parent;
				/*
					Remove `> 0`
					`(( (( array.filter() )).length )) > (( 0 ))`
					----------------------------------^^^^^^^^^^
				*/
				yield fixer.removeRange([
					getParenthesizedRange(lengthNode, sourceCode)[1],
					compareNode.range[1],
				]);

				// The `BinaryExpression` always ends with a number or `)`, no need check for ASI
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.some(…)` over `.filter(…).length` check and `.find(…)`.',
		},
		fixable: 'code',
		messages,
		hasSuggestions: true,
	},
};
