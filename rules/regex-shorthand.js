'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	},
	deprecated: true,
	replacedBy: [
		'unicorn/better-regex'
	]
};
