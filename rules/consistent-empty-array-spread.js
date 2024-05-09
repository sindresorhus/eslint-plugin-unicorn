'use strict';
const {getStaticValue} = require('@eslint-community/eslint-utils');

const MESSAGE_ID= 'consistent-empty-array-spread';
const messages = {
	[MESSAGE_ID]: 'Prefer using empty {{replacementDescription}} since the {{anotherNodePosition}} is {{problemNodeDescription}}.',
};

const isEmptyArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 0;

const isEmptyStringLiteral = node =>
	node.type === 'Literal'
	&& node.value === '';

const isString = (node, context) => {
	const staticValueResult = getStaticValue(node, context.sourceCode.getScope(node));
	return typeof staticValueResult?.value === 'string';
};

const isArray = (node, context) => {
	if (node.type === 'ArrayExpression') {
		return true;
	}

	const staticValueResult = getStaticValue(node, context.sourceCode.getScope(node));
	return Array.isArray(staticValueResult?.value);
};

function getMatchedConditionalExpressionInformation({
	conditionalExpression,
	oneSidePredicate,
	anotherSidePredicate,
	context,
}) {
	const {
		consequent,
		alternate,
	} = conditionalExpression;

	if (oneSidePredicate(alternate, context) && anotherSidePredicate(consequent, context)) {
		return {
			problemNode: alternate,
			anotherNodePosition: 'consequent',
		};
	}

	if (oneSidePredicate(consequent, context) && anotherSidePredicate(alternate, context)) {
		return {
			problemNode: consequent,
			anotherNodePosition: 'alternate',
		};
	}
}

const cases = [
	{
		oneSidePredicate: isEmptyStringLiteral,
		anotherSidePredicate: isArray,
		problemNodeDescription: 'a string',
		replacementDescription: 'array',
		replacementCode: "[]",
	},
	{
		oneSidePredicate: isEmptyArrayExpression,
		anotherSidePredicate: isString,
		problemNodeDescription: 'an array',
		replacementDescription: 'string',
		replacementCode: "''",
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {

	return {
		* ArrayExpression(arrayExpression) {
			for (const element of arrayExpression.elements) {
				if (
					element?.type !== 'SpreadElement'
					|| element.argument.type !== 'ConditionalExpression'
				) {
					continue;
				}

				const conditionalExpression = element.argument;

				for (const {
					oneSidePredicate,
					anotherSidePredicate,
					problemNodeDescription,
					replacementDescription,
					replacementCode,
				} of cases) {
					const information = getMatchedConditionalExpressionInformation({
						conditionalExpression,
						oneSidePredicate,
						anotherSidePredicate,
						context,
					});

					if (!information) {
						continue;
					}

					const {
						problemNode,
						anotherNodePosition,
					} = information;

					yield {
						node: problemNode,
						messageId: MESSAGE_ID,
						data: {
							replacementDescription,
							anotherNodePosition,
							problemNodeDescription,
						},
						fix: fixer => fixer.replaceText(problemNode, replacementCode),
					};

					break;
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer consistent type when spreading a ternary in array literal.',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};
