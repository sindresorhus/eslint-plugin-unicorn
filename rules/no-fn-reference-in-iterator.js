'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = () => ({});

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		deprecated: true,
		replacedBy: [
			'unicorn/no-array-callback-reference'
		]
	}
};
