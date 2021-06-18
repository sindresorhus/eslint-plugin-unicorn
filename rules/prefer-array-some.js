'use strict';
const {methodCallSelector, matches, memberExpressionSelector} = require('./selectors/index.js');
const {checkVueTemplate} = require('./utils/rule.js');
const {isBooleanNode} = require('./utils/boolean.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {removeMemberExpressionProperty} = require('./fix/index.js');

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const ERROR_ID_ARRAY_FILTER = 'filter';
const messages = {
	[ERROR_ID_ARRAY_SOME]: 'Prefer `.some(…)` over `.find(…)`.',
	[SUGGESTION_ID_ARRAY_SOME]: 'Replace `.find(…)` with `.some(…)`.',
	[ERROR_ID_ARRAY_FILTER]: 'Prefer `.some(…)` over non-zero length check from `.filter(…)`.'
};

const arrayFindCallSelector = methodCallSelector({
	name: 'find',
	min: 1,
	max: 2
});

const arrayFilterCallSelector = [
	'BinaryExpression',
	'[right.type="Literal"]',
	// We assume the user already follows `unicorn/explicit-length-check`, these are allowed in that rule
	matches([
		'[operator=">"][right.raw="0"]',
		'[operator="!=="][right.raw="0"]',
		'[operator=">="][right.raw="1"]'
	]),
	' > ',
	`${memberExpressionSelector('length')}.left`,
	' > ',
	`${methodCallSelector('filter')}.object`
].join('');

const create = context => {
	return {
		[arrayFindCallSelector](findCall) {
			if (!isBooleanNode(findCall)) {
				return;
			}

			const findProperty = findCall.callee.property;
			return {
				node: findProperty,
				messageId: ERROR_ID_ARRAY_SOME,
				suggest: [
					{
						messageId: SUGGESTION_ID_ARRAY_SOME,
						fix: fixer => fixer.replaceText(findProperty, 'some')
					}
				]
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
						compareNode.range[1]
					]);

					// The `BinaryExpression` always ends with a number or `)`, no need check for ASI
				}
			};
		}
	};
};

module.exports = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.some(…)` over `.filter(…).length` check and `.find(…)`.'
		},
		fixable: 'code',
		messages,
		hasSuggestions: true
	}
};
