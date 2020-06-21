'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = () => ({});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		deprecated: true,
		replacedBy: [
			'unicorn/better-regex'
		]
	}
};
