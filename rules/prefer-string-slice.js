'use strict';
const eslintTemplateVisitor = require('eslint-template-visitor');
const getDocsUrl = require('./utils/get-docs-url');

const templates = eslintTemplateVisitor();

const objectVariable = templates.variable();
const argumentsVariable = templates.spreadVariable();

const substrCallTemplate = templates.template`${objectVariable}.substr(${argumentsVariable})`;
const substringCallTemplate = templates.template`${objectVariable}.substring(${argumentsVariable})`;

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

			const canFix = argumentNodes.length === 0;

			if (canFix) {
				problem.fix = fixer => fixer.replaceText(node, sourceCode.getText(objectNode) + '.slice()');
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

			const canFix = argumentNodes.length === 0;

			if (canFix) {
				problem.fix = fixer => fixer.replaceText(node, sourceCode.getText(objectNode) + '.slice()');
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
