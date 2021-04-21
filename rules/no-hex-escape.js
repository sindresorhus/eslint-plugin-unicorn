'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

const MESSAGE_ID = 'no-hex-escape';
const messages = {
	[MESSAGE_ID]: 'Use Unicode escapes instead of hexadecimal escapes.'
};

function checkEscape(context, node, value) {
	const fixedValue = value.replace(/(?<=(?:^|[^\\])(?:\\\\)*\\)x/g, 'u00');

	if (value !== fixedValue) {
		context.report({
			node,
			messageId: MESSAGE_ID,
			fix: fixer =>
				node.type === 'TemplateElement' ?
					replaceTemplateElement(fixer, node, fixedValue) :
					fixer.replaceText(node, fixedValue)
		});
	}
}

const create = context => {
	return {
		Literal: node => {
			if (node.regex || typeof node.value === 'string') {
				checkEscape(context, node, node.raw);
			}
		},
		TemplateElement: node => {
			checkEscape(context, node, node.value.raw);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of Unicode escapes instead of hexadecimal escapes.',
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code',
		schema: []
	}
};
