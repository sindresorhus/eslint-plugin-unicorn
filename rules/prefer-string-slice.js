'use strict';
const {getParenthesizedText} = require('./utils/parentheses.js');
const {methodCallSelector} = require('./selectors/index.js');
const isNumber = require('./utils/is-number.js');

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

function getFixArguments(node, context) {
	const argumentNodes = node.arguments;

	if (argumentNodes.length === 0) {
		return [];
	}

	const sourceCode = context.getSourceCode();
	const firstArgument = argumentNodes[0] ? sourceCode.getText(argumentNodes[0]) : undefined;
	const secondArgument = argumentNodes[1] ? sourceCode.getText(argumentNodes[1]) : undefined;

	const method = node.callee.property.name;

	if (method === 'substr') {
		switch (argumentNodes.length) {
			case 1: {
				return [firstArgument];
			}

			case 2: {
				if (firstArgument === '0') {
					const sliceCallArguments = [firstArgument];
					if (isLiteralNumber(secondArgument) || isLengthProperty(argumentNodes[1])) {
						sliceCallArguments.push(secondArgument);
					} else if (typeof getNumericValue(argumentNodes[1]) === 'number') {
						sliceCallArguments.push(Math.max(0, getNumericValue(argumentNodes[1])));
					} else {
						sliceCallArguments.push(`Math.max(0, ${secondArgument})`);
					}

					return sliceCallArguments;
				}

				if (argumentNodes.every(node => isLiteralNumber(node))) {
					return [
						firstArgument,
						argumentNodes[0].value + argumentNodes[1].value,
					];
				}

				if (argumentNodes.every(node => isNumber(node, context.getScope()))) {
					return [firstArgument, firstArgument + ' + ' + secondArgument];
				}

				break;
			}
			// No default
		}
	} else if (method === 'substring') {
		const firstNumber = argumentNodes[0] ? getNumericValue(argumentNodes[0]) : undefined;
		switch (argumentNodes.length) {
			case 1: {
				if (firstNumber !== undefined) {
					return [Math.max(0, firstNumber)];
				}

				if (isLengthProperty(argumentNodes[0])) {
					return [firstArgument];
				}

				return [`Math.max(0, ${firstArgument})`];
			}

			case 2: {
				const secondNumber = getNumericValue(argumentNodes[1]);

				if (firstNumber !== undefined && secondNumber !== undefined) {
					return firstNumber > secondNumber
						? [Math.max(0, secondNumber), Math.max(0, firstNumber)]
						: [Math.max(0, firstNumber), Math.max(0, secondNumber)];
				}

				if (firstNumber === 0 || secondNumber === 0) {
					return [0, `Math.max(0, ${firstNumber === 0 ? secondArgument : firstArgument})`];
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
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			const problem = {
				node,
				messageId: node.callee.property.name,
			};

			const sliceCallArguments = getFixArguments(node, context);
			if (!sliceCallArguments) {
				return problem;
			}

			const objectNode = node.callee.object;
			const objectText = getParenthesizedText(objectNode, sourceCode);
			const optionalMemberSuffix = node.callee.optional ? '?' : '';
			const optionalCallSuffix = node.optional ? '?.' : '';

			problem.fix = fixer => fixer.replaceText(node, `${objectText}${optionalMemberSuffix}.slice${optionalCallSuffix}(${sliceCallArguments.join(', ')})`);

			return problem;
		},
	};
};

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
