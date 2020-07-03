'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const DEFAULT_MESSAGE_ID = 'importStyleDefault';
const NAMESPACE_MESSAGE_ID = 'importStyleNamespace';
const NAMED_MESSAGE_ID = 'importStyleNamed';

const create = context => {
	return {
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[DEFAULT_MESSAGE_ID]: 'Use default import for module `{{module}}`.',
			[NAMESPACE_MESSAGE_ID]: 'Use namespace import for module `{{parameter}}`.',
			[NAMED_MESSAGE_ID]: 'Use named import for module `{{parameter}}`.',
		}
	}
};
