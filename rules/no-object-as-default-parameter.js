'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'noObjectAsDefaultParameter';
const messages = {
	[MESSAGE_ID]: 'Do not use an object literal as default for parameter `{{parameter}}`.'
};

const objectParameterSelector = [
	':function > AssignmentPattern.params',
	'[left.type="Identifier"]',
	'[right.type="ObjectExpression"]',
	'[right.properties.length>0]'
].join('');

const create = context => {
	return {
		[objectParameterSelector]: ({left}) => {
			context.report({
				node: left,
				messageId: MESSAGE_ID,
				data: {parameter: left.name}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
