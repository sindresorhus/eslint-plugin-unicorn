'use strict';
const {getStaticValue} = require('eslint-utils');
const {getParenthesizedText} = require('./utils/parentheses.js');
const {methodCallSelector} = require('./selectors/index.js');
const isNumber = require('./utils/is-number.js');
const {replaceArgument} = require('./fix/index.js');

const MESSAGE_ID_SUBSTR = 'substr';
const MESSAGE_ID_SUBSTRING = 'substring';
const messages = {
	[MESSAGE_ID_SUBSTR]: 'Prefer `String#slice()` over `String#substr()`.',
	[MESSAGE_ID_SUBSTRING]: 'Prefer `String#slice()` over `String#substring()`.',
};

const selector = methodCallSelector({
	methods: ['substr', 'substring'],
	includeOptionalMember: true,
	includeOptionalCall: true,
});

const isLiteralNumber = node => node && node.type === 'Literal' && typeof node.value === 'number';

const getNumericValue = node => {
	if (isLiteralNumber(node)) {
		return node.value;
	}

	if (node.type === 'UnaryExpression' && node.operator === '-') {
		return -getNumericValue(node.argument);
	}
};

// This handles cases where the argument is very likely to be a number, such as `.substring('foo'.length)`.
const isLengthProperty = node => (
	node
	&& node.type === 'MemberExpression'
	&& node.computed === false
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
);

function * fixArguments({node, fixer, context, abort}) {
	const argumentNodes = node.arguments;

	if (argumentNodes.length === 0) {
		return;
	}

	if (
		argumentNodes.length > 2
		|| argumentNodes.some(node => node.type === 'SpreadElement')
	) {
		return abort();
	}

	const sourceCode = context.getSourceCode();
	const scope = context.getScope();
	const [firstArgument, secondArgument] = argumentNodes;
	const [firstArgumentText, secondArgumentText] = argumentNodes.map(node => node ? getParenthesizedText(node, sourceCode) : '');

	const method = node.callee.property.name;
	const replaceArgumentByIndex = (index, text) =>
		replaceArgument(fixer, argumentNodes[index], text, sourceCode);
	const replaceSecondArgument = text => replaceArgumentByIndex(1, text);

	if (method === 'substr') {
		switch (argumentNodes.length) {
			case 1: {
				return;
			}

			case 2: {
				const firstArgumentStaticResult = getStaticValue(firstArgument, scope);
				if (firstArgumentStaticResult && firstArgumentStaticResult.value === 0) {
					if (isLiteralNumber(secondArgument) || isLengthProperty(secondArgument)) {
						return;
					}

					if (typeof getNumericValue(secondArgument) === 'number') {
						yield replaceSecondArgument(Math.max(0, getNumericValue(secondArgument)));
						return;
					}

					yield replaceSecondArgument(`Math.max(0, ${secondArgumentText})`);
					return;
				}

				if (argumentNodes.every(node => isLiteralNumber(node))) {
					yield replaceSecondArgument(firstArgument.value + secondArgument.value);
					return;
				}

				if (argumentNodes.every(node => isNumber(node, context.getScope()))) {
					yield replaceSecondArgument(firstArgumentText + ' + ' + secondArgumentText);
					return;
				}

				break;
			}
			// No default
		}
	} else if (method === 'substring') {
		const firstNumber = firstArgument ? getNumericValue(firstArgument) : undefined;
		const replaceFirstArgument = text => replaceArgumentByIndex(0, text);
		switch (argumentNodes.length) {
			case 1: {
				if (firstNumber !== undefined) {
					yield replaceFirstArgument(Math.max(0, firstNumber));
					return;
				}

				if (isLengthProperty(firstArgument)) {
					return;
				}

				yield replaceFirstArgument(`Math.max(0, ${firstArgumentText})`);
				return;
			}

			case 2: {
				const secondNumber = getNumericValue(secondArgument);

				if (firstNumber !== undefined && secondNumber !== undefined) {
					const argumentsText = [Math.max(0, firstNumber), Math.max(0, secondNumber)];
					if (firstNumber > secondNumber) {
						argumentsText.reverse();
					}

					yield * argumentsText.map((text, index) => replaceArgumentByIndex(index, text));
					return;
				}

				if (firstNumber === 0 || secondNumber === 0) {
					yield replaceFirstArgument(0);
					yield replaceSecondArgument(`Math.max(0, ${firstNumber === 0 ? secondArgumentText : firstArgumentText})`);
					return;
				}

				// As values aren't Literal, we can not know whether secondArgument will become smaller than the first or not, causing an issue:
				//   .substring(0, 2) and .substring(2, 0) returns the same result
				//   .slice(0, 2) and .slice(2, 0) doesn't return the same result
				// There's also an issue with us now knowing whether the value will be negative or not, due to:
				//   .substring() treats a negative number the same as it treats a zero.
				// The latter issue could be solved by wrapping all dynamic numbers in Math.max(0, <value>), but the resulting code would not be nice

				break;
			}
			// No default
		}
	}

	return abort();
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[selector](node) {
		return {
			node,
			messageId: node.callee.property.name,
			* fix(fixer, {abort}) {
				yield * fixArguments({node, fixer, context, abort});
				yield fixer.replaceText(node.callee.property, 'slice');
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#slice()` over `String#substr()` and `String#substring()`.',
		},
		fixable: 'code',
		messages,
	},
};
