'use strict';
const eslintTemplateVisitor = require('eslint-template-visitor');
const getDocumentationUrl = require('./utils/get-documentation-url');

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

	return templates.visitor({
		[substrCallTemplate](node) {
			const objectNode = substrCallTemplate.context.getMatch(objectVariable);
			const argumentNodes = substrCallTemplate.context.getMatch(argumentsVariable);

			const problem = {
				node,
				message: 'Prefer `String#slice()` over `String#substr()`.'
			};

			const firstArgument = argumentNodes[0] ? sourceCode.getText(argumentNodes[0]) : undefined;
			const secondArgument = argumentNodes[1] ? sourceCode.getText(argumentNodes[1]) : undefined;

			let slice;

			if (argumentNodes.length === 0) {
				slice = [];
			} else if (argumentNodes.length === 1) {
				slice = [firstArgument];
			} else if (argumentNodes.length === 2) {
				if (firstArgument === '0') {
					slice = [firstArgument, secondArgument];
				} else if (
					isLiteralNumber(argumentNodes[0]) &&
					isLiteralNumber(argumentNodes[1])
				) {
					slice = [
						firstArgument,
						argumentNodes[0].value + argumentNodes[1].value
					];
				} else if (
					isLikelyNumeric(argumentNodes[0]) &&
					isLikelyNumeric(argumentNodes[1])
				) {
					slice = [firstArgument, firstArgument + ' + ' + secondArgument];
				}
			}

			if (slice) {
				const objectText = objectNode.type === 'LogicalExpression' ?
					`(${sourceCode.getText(objectNode)})` :
					sourceCode.getText(objectNode);

				problem.fix = fixer => fixer.replaceText(node, `${objectText}.slice(${slice.join(', ')})`);
			}

			context.report(problem);
		},

		[substringCallTemplate](node) {
			const objectNode = substringCallTemplate.context.getMatch(objectVariable);
			const argumentNodes = substringCallTemplate.context.getMatch(argumentsVariable);

			const problem = {
				node,
				message: 'Prefer `String#slice()` over `String#substring()`.'
			};

			const firstArgument = argumentNodes[0] ? sourceCode.getText(argumentNodes[0]) : undefined;
			const secondArgument = argumentNodes[1] ? sourceCode.getText(argumentNodes[1]) : undefined;

			const firstNumber = argumentNodes[0] ? getNumericValue(argumentNodes[0]) : undefined;

			let slice;

			if (argumentNodes.length === 0) {
				slice = [];
			} else if (argumentNodes.length === 1) {
				if (firstNumber !== undefined) {
					slice = [Math.max(0, firstNumber)];
				} else if (isLengthProperty(argumentNodes[0])) {
					slice = [firstArgument];
				} else {
					slice = [`Math.max(0, ${firstArgument})`];
				}
			} else if (argumentNodes.length === 2) {
				const secondNumber = argumentNodes[1] ? getNumericValue(argumentNodes[1]) : undefined;

				if (firstNumber !== undefined && secondNumber !== undefined) {
					slice = firstNumber > secondNumber ?
						[Math.max(0, secondNumber), Math.max(0, firstNumber)] :
						[Math.max(0, firstNumber), Math.max(0, secondNumber)];
				} else if (firstNumber === 0 || secondNumber === 0) {
					slice = [0, `Math.max(0, ${firstNumber === 0 ? secondArgument : firstArgument})`];
				} else {
					// As values aren't Literal, we can not know whether secondArgument will become smaller than the first or not, causing an issue:
					//   .substring(0, 2) and .substring(2, 0) returns the same result
					//   .slice(0, 2) and .slice(2, 0) doesn't return the same result
					// There's also an issue with us now knowing whether the value will be negative or not, due to:
					//   .substring() treats a negative number the same as it treats a zero.
					// The latter issue could be solved by wrapping all dynamic numbers in Math.max(0, <value>), but the resulting code would not be nice
				}
			}

			if (slice) {
				const objectText = objectNode.type === 'LogicalExpression' ?
					`(${sourceCode.getText(objectNode)})` :
					sourceCode.getText(objectNode);

				problem.fix = fixer => fixer.replaceText(node, `${objectText}.slice(${slice.join(', ')})`);
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
		fixable: 'code'
	}
};
