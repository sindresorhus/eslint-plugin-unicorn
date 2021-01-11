'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-unreadable-array-destructuring';
const messages = {
	[MESSAGE_ID]: 'Array destructuring may not contain consecutive ignored values.'
};

const isCommaFollowedWithComma = (element, index, array) =>
	element === null && array[index + 1] === null;

const create = context => {
	return {
		'ArrayPattern[elements.length>=3]': node => {
			if (node.elements.some((element, index, array) => isCommaFollowedWithComma(element, index, array))) {
				context.report({
					node,
					messageId: MESSAGE_ID
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
		messages
	}
};
