'use strict';
const eslintTemplateVisitor = require('eslint-template-visitor');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_SUBSTR = 'substr';
const MESSAGE_ID_SUBSTRING = 'substring';
const messages = {
	[MESSAGE_ID_SUBSTR]: 'Prefer `String#slice()` over `String#substr()`.',
	[MESSAGE_ID_SUBSTRING]: 'Prefer `String#slice()` over `String#substring()`.'
};

const templates = eslintTemplateVisitor();

const objectVariable = templates.variable();
const argumentsVariable = templates.spreadVariable();

const substrCallTemplate = templates.template`${objectVariable}.substr(${argumentsVariable})`;
const substringCallTemplate = templates.template`${objectVariable}.substring(${argumentsVariable})`;

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
	node &&
	node.type === 'MemberExpression' &&
	node.computed === false &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length'
);

const isLikelyNumeric = node => isLiteralNumber(node) || isLengthProperty(node);

const create = context => {
	const sourceCode = context.getSourceCode();

	const getNodeText = node => {
		const text = sourceCode.getText(node);
		const before = sourceCode.getTokenBefore(node);
		const after = sourceCode.getTokenAfter(node);
		if (
			(before && before.type === 'Punctuator' && before.value === '(') &&
			(after && after.type === 'Punctuator' && after.value === ')')
		) {
			return `(${text})`;
		}

		return text;
	};

	return templates.visitor({
		[substrCallTemplate](node) {
			const objectNode = substrCallTemplate.context.getMatch(objectVariable);
			const argumentNodes = substrCallTemplate.context.getMatch(argumentsVariable);

			const problem = {
				node,
				messageId: MESSAGE_ID_SUBSTR
			};

			const firstArgument = argumentNodes[0] ? sourceCode.getText(argumentNodes[0]) : undefined;
			const secondArgument = argumentNodes[1] ? sourceCode.getText(argumentNodes[1]) : undefined;

			let sliceArguments;

			if (argumentNodes.length === 0) {
				sliceArguments = [];
			} else if (argumentNodes.length === 1) {
				sliceArguments = [firstArgument];
			} else if (argumentNodes.length === 2) {
				if (firstArgument === '0') {
					sliceArguments = [firstArgument];
					if (isLiteralNumber(secondArgument) || isLengthProperty(argumentNodes[1])) {
						sliceArguments.push(secondArgument);
					} else if (typeof getNumericValue(argumentNodes[1]) === 'number') {
						sliceArguments.push(Math.max(0, getNumericValue(argumentNodes[1])));
					} else {
						sliceArguments.push(`Math.max(0, ${secondArgument})`);
					}
				} else if (
					isLiteralNumber(argumentNodes[0]) &&
					isLiteralNumber(argumentNodes[1])
				) {
					sliceArguments = [
						firstArgument,
						argumentNodes[0].value + argumentNodes[1].value
					];
				} else if (
					isLikelyNumeric(argumentNodes[0]) &&
					isLikelyNumeric(argumentNodes[1])
				) {
					sliceArguments = [firstArgument, firstArgument + ' + ' + secondArgument];
				}
			}

			if (sliceArguments) {
				const objectText = getNodeText(objectNode);
				const optionalMemberSuffix = node.callee.optional ? '?' : '';
				const optionalCallSuffix = node.optional ? '?.' : '';

				problem.fix = fixer => fixer.replaceText(node, `${objectText}${optionalMemberSuffix}.slice${optionalCallSuffix}(${sliceArguments.join(', ')})`);
			}

			context.report(problem);
		},

		[substringCallTemplate](node) {
			const objectNode = substringCallTemplate.context.getMatch(objectVariable);
			const argumentNodes = substringCallTemplate.context.getMatch(argumentsVariable);

			const problem = {
				node,
				messageId: MESSAGE_ID_SUBSTRING
			};

			const firstArgument = argumentNodes[0] ? sourceCode.getText(argumentNodes[0]) : undefined;
			const secondArgument = argumentNodes[1] ? sourceCode.getText(argumentNodes[1]) : undefined;

			const firstNumber = argumentNodes[0] ? getNumericValue(argumentNodes[0]) : undefined;

			let sliceArguments;

			if (argumentNodes.length === 0) {
				sliceArguments = [];
			} else if (argumentNodes.length === 1) {
				if (firstNumber !== undefined) {
					sliceArguments = [Math.max(0, firstNumber)];
				} else if (isLengthProperty(argumentNodes[0])) {
					sliceArguments = [firstArgument];
				} else {
					sliceArguments = [`Math.max(0, ${firstArgument})`];
				}
			} else if (argumentNodes.length === 2) {
				const secondNumber = getNumericValue(argumentNodes[1]);

				if (firstNumber !== undefined && secondNumber !== undefined) {
					sliceArguments = firstNumber > secondNumber ?
						[Math.max(0, secondNumber), Math.max(0, firstNumber)] :
						[Math.max(0, firstNumber), Math.max(0, secondNumber)];
				} else if (firstNumber === 0 || secondNumber === 0) {
					sliceArguments = [0, `Math.max(0, ${firstNumber === 0 ? secondArgument : firstArgument})`];
				} else {
					// As values aren't Literal, we can not know whether secondArgument will become smaller than the first or not, causing an issue:
					//   .substring(0, 2) and .substring(2, 0) returns the same result
					//   .slice(0, 2) and .slice(2, 0) doesn't return the same result
					// There's also an issue with us now knowing whether the value will be negative or not, due to:
					//   .substring() treats a negative number the same as it treats a zero.
					// The latter issue could be solved by wrapping all dynamic numbers in Math.max(0, <value>), but the resulting code would not be nice
				}
			}

			if (sliceArguments) {
				const objectText = getNodeText(objectNode);
				const optionalMemberSuffix = node.callee.optional ? '?' : '';
				const optionalCallSuffix = node.optional ? '?.' : '';

				problem.fix = fixer => fixer.replaceText(node, `${objectText}${optionalMemberSuffix}.slice${optionalCallSuffix}(${sliceArguments.join(', ')})`);
			}

			context.report(problem);
		}
	});
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
