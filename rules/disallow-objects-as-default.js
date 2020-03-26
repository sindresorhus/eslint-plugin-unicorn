'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'disallowObjectsAsDefault';

const objectParameterSelector = [
	'AssignmentPattern',
	'[left.type="Identifier"]',
	'[right.type="ObjectExpression"]',
	'[right.properties.length>0]'
].join('');

const create = context => {
	return {
		[objectParameterSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {parameter: node.left.name}
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
		messages: {
			[MESSAGE_ID]: 'Do not assign default object to parameter `{{parameter}}`.'
		}
	}
};
