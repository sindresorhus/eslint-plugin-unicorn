'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isParethesized = (sourceCode, node) => {
	const previousToken = sourceCode.getTokenBefore(node);
	const nextToken = sourceCode.getTokenAfter(node);

	return Boolean(previousToken && nextToken) &&
		previousToken.value === '(' &&
		previousToken.end <= node.start &&
		nextToken.value === ')' &&
		nextToken.start >= node.end;
};

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		ConditionalExpression: node => {
			const nodesToCheck = [node.alternate, node.consequent];

			for (const childNode of nodesToCheck) {
				if (childNode.type !== 'ConditionalExpression') {
					continue;
				}

				const message = 'Do not nest ternary expressions.';

				// Nesting more than one level not allowed.
				if (childNode.alternate.type === 'ConditionalExpression' || childNode.consequent.type === 'ConditionalExpression') {
					context.report({node, message});
					break;
				} else if (!isParethesized(sourceCode, childNode)) {
					context.report({
						node: childNode,
						message,
						fix: fixer => [
							fixer.insertTextBefore(childNode, '('),
							fixer.insertTextAfter(childNode, ')')
						]
					});
				}
			}
		}
	};
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
