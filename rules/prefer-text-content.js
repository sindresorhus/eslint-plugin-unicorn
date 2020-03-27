'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const message = 'Prefer `.textContent` over `.innerText`.';

const selector = [
	'MemberExpression',
	'[computed=false]',
	'[property.type="Identifier"]',
	'[property.name="innerText"]'
].join('');

const create = context => {
	return {
		[selector]: ({property: node}) => {
			context.report({
				node,
				message,
				fix: fixer => fixer.replaceText(node, 'textContent')
			});
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
