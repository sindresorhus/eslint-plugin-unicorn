'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getQuotedReplacement = (node, value) => {
	const leftQuote = node.raw.charAt(0);
	const rightQuote = node.raw.charAt(node.raw.length - 1);
	return `${leftQuote}${value}${rightQuote}`;
};

const message = 'Prefer `textContent` over `innerText`.';

const create = context => {
	return {
		MemberExpression: node => {
			const {property} = node;

			if (property.type === 'Identifier' && !node.computed && property.name === 'innerText') {
				// Handles node.innerText
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(property, 'textContent')
				});
			} else if (property.type === 'Literal' && property.value === 'innerText') {
				// Handles node['innerText'] or node["innerText"]
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(property, getQuotedReplacement(property, 'textContent'))
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
