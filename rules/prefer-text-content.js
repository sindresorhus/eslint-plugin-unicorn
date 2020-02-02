'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const message = 'Prefer `.textContent` over `.innerText`.';

const create = context => {
	return {
		MemberExpression: node => {
			const {property} = node;

			if (
				property.type === 'Identifier' &&
				!node.computed &&
				property.name === 'innerText'
			) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(property, 'textContent')
				});
			}
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
		fixable: 'code'
	}
};
