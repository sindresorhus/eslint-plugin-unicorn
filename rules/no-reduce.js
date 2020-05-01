'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = () => {
	return {

	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		}
	}
};
