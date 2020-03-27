'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = (context) => ({
  Literal: (node) => {
    if (node.raw === 'null') {
      context.report({
        node: node,
        message: 'Use undefined instead of null'
      });
    }
  },
});

module.exports = {
  meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
	},
  create,
};
