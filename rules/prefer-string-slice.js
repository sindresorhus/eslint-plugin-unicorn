'use strict';
const eslintTemplateVisitor = require('eslint-template-visitor');
const getDocumentationUrl = require('./utils/get-documentation-url');

const templates = eslintTemplateVisitor();

const objectVariable = templates.variable();
const argumentsVariable = templates.spreadVariable();

const substrCallTemplate = templates.template`${objectVariable}.substr(${argumentsVariable})`;
const substringCallTemplate = templates.template`${objectVariable}.substring(${argumentsVariable})`;

const create = context => {
	const sourceCode = context.getSourceCode();

	const getPossiblyWrappedText = objectNode => objectNode.type === 'LogicalExpression' ? `(${sourceCode.getText(objectNode)})` : sourceCode.getText(objectNode);

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

			if (argumentNodes.length === 0) {
				problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + '.slice()');
			} else if (argumentNodes.length === 1) {
				problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + `.slice(${firstArgument})`);
			} else if (argumentNodes.length === 2) {
				if (firstArgument === '0') {
					problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + `.slice(${firstArgument}, ${secondArgument})`);
				} else if (argumentNodes[0].type === 'Literal') {
					problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + `.slice(${firstArgument}, ${firstArgument} + ${secondArgument})`);
				}
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

			if (argumentNodes.length === 0) {
				problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + '.slice()');
			} else if (argumentNodes.length === 1) {
				problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + `.slice(${firstArgument})`);
			} else if (argumentNodes.length === 2) {
				problem.fix = fixer => fixer.replaceText(node, getPossiblyWrappedText(objectNode) + `.slice(${firstArgument}, ${secondArgument})`);
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
