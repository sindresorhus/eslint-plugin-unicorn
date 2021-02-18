'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');

const MESSAGE_ID = 'no-unreadable-array-destructuring';
const messages = {
	[MESSAGE_ID]: 'Array destructuring may not contain consecutive ignored values.'
};

const isCommaFollowedWithComma = (element, index, array) =>
	element === null && array[index + 1] === null;

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		'ArrayPattern[elements.length>=3]'(node) {
			const {elements, parent} = node;

			if (!elements.some((element, index, elements) => isCommaFollowedWithComma(element, index, elements))) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID
			};

			const nonNullElements = elements.filter(node => node !== null);
			if (
				parent.type === 'VariableDeclarator' &&
				parent.id === node &&
				parent.init !== null &&
				nonNullElements.length === 1
			) {
				const [element] = nonNullElements;

				if (element.type !== 'AssignmentPattern') {
					problem.fix = function * (fixer) {
						const index = elements.indexOf(element);
						const isSlice = element.type === 'RestElement';
						const variable = isSlice ? element.argument : element;

						yield fixer.replaceText(node, sourceCode.getText(variable));

						const code = isSlice ? `.slice(${index})` : `[${index}]`;
						const array = parent.init;
						if (
							!isParenthesized(array, sourceCode) &&
							shouldAddParenthesesToMemberExpressionObject(array, sourceCode)
						) {
							yield fixer.insertTextBefore(array, '(');
							yield fixer.insertTextAfter(parent, `)${code}`);
						} else {
							yield fixer.insertTextAfter(parent, code);
						}
					};
				}
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code'
	}
};
