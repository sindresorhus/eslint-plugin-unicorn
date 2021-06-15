'use strict';

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

const create = () => {
	return {
		[objectParameterSelector]: node => {
			return {
				node: node.left,
				messageId: MESSAGE_ID,
				data: {parameter: node.left.name}
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow the use of objects as default parameters.'
		},
		messages
	}
};
