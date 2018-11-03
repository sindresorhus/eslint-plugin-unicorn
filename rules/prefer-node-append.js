'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getMethodName = memberExpression => memberExpression.property.name;

const fix = (fixer, sourceCode, callNode, memberExpression) => {
	const nodeCode = sourceCode.getText(memberExpression.object);
	const argumentsCode = sourceCode.getText(callNode.arguments[0]);
	const fixedCodeStatement = `${nodeCode}.append(${argumentsCode})`;
	return fixer.replaceText(callNode, fixedCodeStatement);
};

const create = context => {
	return {
		CallExpression(node) {
			const memberExpression = node.callee;
			const methodName = getMethodName(memberExpression);

			if (methodName === 'appendChild') {
				context.report({
					node,
					message: 'Prefer `append` over `appendChild`',
					fix: fixer => fix(fixer, context.getSourceCode(), node, memberExpression)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
